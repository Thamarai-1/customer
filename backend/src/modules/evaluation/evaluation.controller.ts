import { Request, Response } from 'express';
import { EvaluationService } from './evaluation.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class EvaluationController {
  /**
   * GET /api/v1/evaluation/overview
   */
  static async getOverview(_req: Request, res: Response): Promise<void> {
    try {
      const report = await EvaluationService.generateComprehensiveReport();
      ResponseUtil.success(res, 'Evaluation report assembled successfully', report);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'EVALUATION_FAILED', undefined, 500);
    }
  }

  /**
   * GET /api/v1/evaluation/segmentation
   */
  static async getSegmentationEvaluation(_req: Request, res: Response): Promise<void> {
    try {
      const segEval = await EvaluationService.evaluateSegmentation();
      ResponseUtil.success(res, 'Segmentation evaluation calculated successfully', segEval);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'SEGMENTATION_EVALUATION_FAILED', undefined, 500);
    }
  }

  /**
   * GET /api/v1/evaluation/report?format=json|csv
   */
  static async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string)?.toLowerCase() || 'json';

      if (format === 'csv') {
        const csvContent = await EvaluationService.exportReportCsv();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="evaluation-report.csv"');
        res.status(200).send(csvContent);
        return;
      }

      const report = await EvaluationService.generateComprehensiveReport();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="evaluation-report.json"');
      res.status(200).json(report);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'EXPORT_FAILED', undefined, 500);
    }
  }
}
