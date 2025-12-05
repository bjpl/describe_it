import { SessionRepository, SessionEntity } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotFoundError, ValidationError } from '../errors';
import type { ServiceResult } from '../types';

export class SessionService {
  constructor(
    private sessionRepository: SessionRepository,
    private userRepository: UserRepository
  ) {}

  async createSession(
    userId: string,
    sessionData: Omit<SessionEntity, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ): Promise<ServiceResult<SessionEntity>> {
    try {
      const userExists = await this.userRepository.exists(userId);

      if (!userExists) {
        throw new NotFoundError('User', userId);
      }

      const session = await this.sessionRepository.create({
        ...sessionData,
        user_id: userId,
        status: 'active',
        started_at: new Date().toISOString(),
      } as Omit<SessionEntity, 'id' | 'created_at' | 'updated_at'>);

      // Track user activity
      await this.userRepository.updateLastActive(userId);

      return {
        success: true,
        data: session,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async getSession(sessionId: string): Promise<ServiceResult<SessionEntity>> {
    try {
      const session = await this.sessionRepository.findById(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      return {
        success: true,
        data: session,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async getUserSessions(
    userId: string,
    limit: number = 10
  ): Promise<ServiceResult<SessionEntity[]>> {
    try {
      const sessions = await this.sessionRepository.findByUser(userId, limit);

      return {
        success: true,
        data: sessions,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async getActiveSessions(userId: string): Promise<ServiceResult<SessionEntity[]>> {
    try {
      const sessions = await this.sessionRepository.findActiveByUser(userId);

      return {
        success: true,
        data: sessions,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async completeSession(
    sessionId: string,
    completionData: {
      score?: number;
      accuracy?: number;
      time_spent?: number;
    }
  ): Promise<ServiceResult<SessionEntity>> {
    try {
      const session = await this.sessionRepository.findById(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      if (session.status !== 'active') {
        throw new ValidationError('Session is not active');
      }

      const updatedSession = await this.sessionRepository.completeSession(
        sessionId,
        completionData
      );

      // Award points if score is provided
      if (completionData.score && completionData.score > 0) {
        await this.userRepository.addPoints(
          session.user_id,
          Math.floor(completionData.score)
        );
      }

      // Update streak
      await this.userRepository.incrementStreak(session.user_id);

      return {
        success: true,
        data: updatedSession,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async abandonSession(sessionId: string): Promise<ServiceResult<SessionEntity>> {
    try {
      const session = await this.sessionRepository.findById(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      if (session.status !== 'active') {
        throw new ValidationError('Session is not active');
      }

      const updatedSession = await this.sessionRepository.abandonSession(sessionId);

      return {
        success: true,
        data: updatedSession,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }
}
