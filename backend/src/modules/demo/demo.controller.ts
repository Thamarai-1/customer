import { Request, Response } from 'express';
import { DemoService } from './demo.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class DemoController {
  /**
   * GET /api/v1/demo/scenarios
   */
  static async getScenariosState(_req: Request, res: Response): Promise<void> {
    try {
      const state = await DemoService.getScenariosState();
      ResponseUtil.success(res, 'Demo scenarios retrieved successfully', state);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'DEMO_STATE_FETCH_FAILED', undefined, 500);
    }
  }

  /**
   * POST /api/v1/demo/scenarios/:scenarioId/run
   */
  static async runScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = req.params.scenarioId || '';
      const actor = req.user ? { id: req.user.id, name: req.user.email } : undefined;

      const result = await DemoService.runScenario(scenarioId, actor);
      ResponseUtil.success(res, `Demo scenario '${scenarioId}' executed successfully`, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'SCENARIO_RUN_FAILED', undefined, 400);
    }
  }

  /**
   * POST /api/v1/demo/scenarios/:scenarioId/reset
   */
  static async resetScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = req.params.scenarioId || '';
      await DemoService.resetScenario(scenarioId);
      ResponseUtil.success(res, `Scenario '${scenarioId}' reset successfully`, { scenarioId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'SCENARIO_RESET_FAILED', undefined, 400);
    }
  }

  /**
   * POST /api/v1/demo/refusals/:refusalId/run
   */
  static async runRefusal(req: Request, res: Response): Promise<void> {
    try {
      const refusalId = req.params.refusalId || '';
      const result = await DemoService.runRefusal(refusalId);
      ResponseUtil.success(res, `Refusal demonstration '${refusalId}' executed successfully`, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'REFUSAL_DEMO_FAILED', undefined, 400);
    }
  }

  /**
   * POST /api/v1/demo/reset-all
   */
  static async resetAllDemoData(_req: Request, res: Response): Promise<void> {
    try {
      const result = await DemoService.resetAllDemoData();
      ResponseUtil.success(res, result.message, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith('SECURITY_BLOCK')) {
        ResponseUtil.error(res, message, 'FORBIDDEN', undefined, 403);
        return;
      }
      ResponseUtil.error(res, message, 'DEMO_RESET_ALL_FAILED', undefined, 500);
    }
  }
}
