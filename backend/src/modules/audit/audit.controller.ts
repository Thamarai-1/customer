import { Request, Response } from 'express';
import { AuditLogModel } from './audit-log.model.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../../utils/pagination.js';

export class AuditController {
  /**
   * GET /api/v1/audit/logs
   */
  static async listLogs(req: Request, res: Response): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query);
      const { action, actorId, entityType, entityId } = req.query;

      const query: Record<string, unknown> = {};
      if (action) query.action = action;
      if (actorId) query.actorId = actorId;
      if (entityType) query.entityType = entityType;
      if (entityId) query.entityId = entityId;

      const total = await AuditLogModel.countDocuments(query);
      const logs = await AuditLogModel.find(query)
        .sort({ timestamp: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit);

      const meta = getPaginationMeta(total, pagination.page, pagination.limit);
      ResponseUtil.success(res, 'Audit logs retrieved successfully', logs, meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'AUDIT_LOG_FETCH_FAILED', undefined, 500);
    }
  }
}
