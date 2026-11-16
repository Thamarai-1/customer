import { parse } from 'csv-parse/sync';
import { CustomerModel, ICustomer } from '../customers/customer.model.js';
import { CommunicationPreferenceModel, PreferredChannel } from '../communications/preference.model.js';
import { importCustomerRecordSchema, ValidatedImportRecord } from './import.validation.js';

export interface ImportErrorDetail {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicates: number;
  errors: ImportErrorDetail[];
}

export class ImportService {
  static async importData(
    fileBuffer: Buffer,
    fileType: 'csv' | 'json'
  ): Promise<ImportResult> {
    let rawRecords: Record<string, unknown>[] = [];

    // Parse input file format
    if (fileType === 'csv') {
      try {
        rawRecords = parse(fileBuffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (err: unknown) {
        throw new Error(`CSV parsing failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      try {
        const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
        rawRecords = Array.isArray(jsonContent) ? jsonContent : [jsonContent];
      } catch (err: unknown) {
        throw new Error(`JSON parsing failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const totalRecords = rawRecords.length;
    let successfulRecords = 0;
    let failedRecords = 0;
    let duplicates = 0;
    const errors: ImportErrorDetail[] = [];

    const validDocsToInsert: Partial<ICustomer>[] = [];
    const seenBatchIds = new Set<string>();
    const seenBatchEmails = new Set<string>();

    // 1. In-memory validation and intra-batch duplicate check
    for (let i = 0; i < rawRecords.length; i++) {
      const rowNum = i + 1;
      const rawRow = rawRecords[i];

      const validationResult = importCustomerRecordSchema.safeParse(rawRow);
      if (!validationResult.success) {
        failedRecords++;
        validationResult.error.errors.forEach((e) => {
          errors.push({
            row: rowNum,
            field: e.path.join('.') || 'record',
            message: e.message
          });
        });
        continue;
      }

      const validRecord: ValidatedImportRecord = validationResult.data;
      const normalizedCustomerId = validRecord.customerId.toUpperCase().trim();
      const normalizedEmail = validRecord.email.toLowerCase().trim();

      // Check intra-batch duplicate
      if (seenBatchIds.has(normalizedCustomerId)) {
        failedRecords++;
        duplicates++;
        errors.push({
          row: rowNum,
          field: 'customerId',
          message: `Duplicate customerId '${normalizedCustomerId}' in uploaded file`
        });
        continue;
      }

      if (seenBatchEmails.has(normalizedEmail)) {
        failedRecords++;
        duplicates++;
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Duplicate email '${normalizedEmail}' in uploaded file`
        });
        continue;
      }

      seenBatchIds.add(normalizedCustomerId);
      seenBatchEmails.add(normalizedEmail);

      validDocsToInsert.push({
        customerId: normalizedCustomerId,
        firstName: validRecord.firstName,
        lastName: validRecord.lastName,
        email: normalizedEmail,
        phone: validRecord.phone,
        customerType: validRecord.customerType,
        accountStatus: validRecord.accountStatus,
        loyaltyInfo: {
          loyaltyTier: validRecord.loyaltyTier,
          loyaltyPoints: validRecord.loyaltyPoints,
          membershipStartDate: new Date()
        },
        subscription: {
          activePlan: validRecord.activePlan,
          planType: validRecord.planType,
          planStatus: validRecord.planStatus,
          planStartDate: new Date()
        },
        source: 'FILE_IMPORT'
      });
    }

    // 2. Database existence check for remaining candidates
    if (validDocsToInsert.length > 0) {
      const candidateIds = validDocsToInsert.map((d) => d.customerId!);
      const candidateEmails = validDocsToInsert.map((d) => d.email!);

      const existingInDb = await CustomerModel.find({
        $or: [{ customerId: { $in: candidateIds } }, { email: { $in: candidateEmails } }]
      }).select('customerId email');

      const existingDbIds = new Set(existingInDb.map((c) => c.customerId));
      const existingDbEmails = new Set(existingInDb.map((c) => c.email));

      const finalInsertList: Partial<ICustomer>[] = [];

      for (let i = 0; i < validDocsToInsert.length; i++) {
        const item = validDocsToInsert[i];
        if (!item || !item.customerId || !item.email) continue;

        if (existingDbIds.has(item.customerId)) {
          failedRecords++;
          duplicates++;
          errors.push({
            row: i + 1,
            field: 'customerId',
            message: `Customer ID '${item.customerId}' already exists in database`
          });
          continue;
        }

        if (existingDbEmails.has(item.email)) {
          failedRecords++;
          duplicates++;
          errors.push({
            row: i + 1,
            field: 'email',
            message: `Email '${item.email}' already exists in database`
          });
          continue;
        }

        finalInsertList.push(item);
      }

      // 3. Perform bulk insert
      if (finalInsertList.length > 0) {
        const insertedCustomers = await CustomerModel.insertMany(finalInsertList, { ordered: false });
        successfulRecords = insertedCustomers.length;

        // Initialize default communication preferences for imported customers
        const preferenceDocs = insertedCustomers.map((cust) => ({
          customerId: cust.customerId,
          customerRef: cust._id,
          emailConsent: true,
          smsConsent: false,
          whatsappConsent: false,
          preferredChannel: PreferredChannel.EMAIL,
          optedOut: false,
          consentUpdatedAt: new Date(),
          consentSource: 'BATCH_IMPORT'
        }));

        await CommunicationPreferenceModel.insertMany(preferenceDocs, { ordered: false }).catch(() => {});
      }
    }

    return {
      totalRecords,
      successfulRecords,
      failedRecords,
      duplicates,
      errors
    };
  }
}
