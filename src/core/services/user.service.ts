import { UserRepository, UserEntity } from '../repositories/user.repository';
import { NotFoundError, ValidationError } from '../errors';
import type { ServiceResult } from '../types';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUser(userId: string): Promise<ServiceResult<UserEntity>> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async getUserByEmail(email: string): Promise<ServiceResult<UserEntity>> {
    try {
      if (!email || !email.includes('@')) {
        throw new ValidationError('Invalid email address');
      }

      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<UserEntity>
  ): Promise<ServiceResult<UserEntity>> {
    try {
      const exists = await this.userRepository.exists(userId);

      if (!exists) {
        throw new NotFoundError('User', userId);
      }

      const user = await this.userRepository.update(userId, updates);
      await this.userRepository.updateLastActive(userId);

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async trackActivity(userId: string): Promise<ServiceResult<void>> {
    try {
      await this.userRepository.updateLastActive(userId);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async awardPoints(userId: string, points: number): Promise<ServiceResult<UserEntity>> {
    try {
      if (points <= 0) {
        throw new ValidationError('Points must be positive');
      }

      await this.userRepository.addPoints(userId, points);
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  async updateStreak(userId: string): Promise<ServiceResult<UserEntity>> {
    try {
      await this.userRepository.incrementStreak(userId);
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      return {
        success: true,
        data: user,
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
