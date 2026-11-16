import { Request, Response } from 'express';
import { UserService } from './user.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';

export class UserController {
  static async list(req: Request, res: Response): Promise<void> {
    const pagination = getPaginationParams(req.query as Record<string, unknown>);
    const result = await UserService.listUsers(pagination);
    ResponseUtil.success(res, 'Users retrieved successfully', result.users, result.meta, 200);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const userId = req.params.id as string;
    const user = await UserService.getUserById(userId);
    if (!user) {
      ResponseUtil.error(res, 'User not found', 'NOT_FOUND', undefined, 404);
      return;
    }
    ResponseUtil.success(res, 'User retrieved successfully', user, undefined, 200);
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const user = await UserService.createUser(req.body);
      ResponseUtil.success(res, 'User created successfully', user, undefined, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'EMAIL_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'A user with this email address already exists', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, 'Failed to create user', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const userId = req.params.id as string;
    const updatedUser = await UserService.updateUser(userId, req.body);
    if (!updatedUser) {
      ResponseUtil.error(res, 'User not found', 'NOT_FOUND', undefined, 404);
      return;
    }
    ResponseUtil.success(res, 'User updated successfully', updatedUser, undefined, 200);
  }

  static async deactivate(req: Request, res: Response): Promise<void> {
    const userId = req.params.id as string;
    const user = await UserService.deactivateUser(userId);
    if (!user) {
      ResponseUtil.error(res, 'User not found', 'NOT_FOUND', undefined, 404);
      return;
    }
    ResponseUtil.success(res, 'User deactivated successfully', user, undefined, 200);
  }
}
