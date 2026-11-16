import { CommunicationPreferenceModel, ICommunicationPreference, PreferredChannel } from './preference.model.js';
import { CustomerRepository } from '../customers/customer.repository.js';

export interface UpdatePreferenceDTO {
  emailConsent?: boolean;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
  preferredChannel?: PreferredChannel;
  optedOut?: boolean;
  consentSource?: string;
  notes?: string;
}

export class PreferenceService {
  static async getPreferences(customerIdOrId: string): Promise<ICommunicationPreference> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    let pref = await CommunicationPreferenceModel.findOne({
      $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
    });

    if (!pref) {
      pref = await CommunicationPreferenceModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        emailConsent: true, // Default email consent
        smsConsent: false,
        whatsappConsent: false,
        preferredChannel: PreferredChannel.EMAIL,
        optedOut: false,
        consentUpdatedAt: new Date(),
        consentSource: 'DEFAULT_INITIALIZATION'
      });
    }

    return pref;
  }

  static async updatePreferences(
    customerIdOrId: string,
    data: UpdatePreferenceDTO
  ): Promise<ICommunicationPreference> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    let pref = await CommunicationPreferenceModel.findOne({
      $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
    });

    if (!pref) {
      pref = new CommunicationPreferenceModel({
        customerId: customer.customerId,
        customerRef: customer._id
      });
    }

    if (data.emailConsent !== undefined) pref.emailConsent = data.emailConsent;
    if (data.smsConsent !== undefined) pref.smsConsent = data.smsConsent;
    if (data.whatsappConsent !== undefined) pref.whatsappConsent = data.whatsappConsent;
    if (data.preferredChannel) pref.preferredChannel = data.preferredChannel;
    if (data.optedOut !== undefined) pref.optedOut = data.optedOut;
    if (data.consentSource) pref.consentSource = data.consentSource;
    if (data.notes) pref.notes = data.notes;

    pref.consentUpdatedAt = new Date();
    return pref.save();
  }
}
