import { Request, Response } from 'express';
import { ImportService } from './import.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class ImportController {
  static async importCustomers(req: Request, res: Response): Promise<void> {
    try {
      let buffer: Buffer;
      let fileType: 'csv' | 'json';

      // Support multipart file upload (preferred)
      if (req.file) {
        buffer = req.file.buffer;
        const originalName = req.file.originalname.toLowerCase();
        fileType = originalName.endsWith('.json') ? 'json' : 'csv';
      } else if (req.body && (Array.isArray(req.body) || req.body.records)) {
        // Direct JSON body array fallback
        const payload = Array.isArray(req.body) ? req.body : req.body.records;
        buffer = Buffer.from(JSON.stringify(payload), 'utf-8');
        fileType = 'json';
      } else {
        ResponseUtil.error(
          res,
          'No file or data provided for import. Please upload a CSV/JSON file using field name "file" or provide a JSON array.',
          'BAD_REQUEST',
          undefined,
          400
        );
        return;
      }

      const result = await ImportService.importData(buffer, fileType);

      ResponseUtil.success(
        res,
        `Data import completed: ${result.successfulRecords} succeeded, ${result.failedRecords} failed.`,
        result,
        undefined,
        200
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ResponseUtil.error(res, `Import failed: ${message}`, 'IMPORT_FAILED', undefined, 400);
    }
  }
}
