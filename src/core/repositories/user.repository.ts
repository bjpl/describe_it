import { BaseRepository, BaseEntity } from './base.repository';
import type { User } from '@/core/types';

export interface UserEntity extends BaseEntity {
  email?: string;
  full_name?: string;
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  subscription_status: 'free' | 'premium' | 'trial';
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_at?: string;
}

export class UserRepository extends BaseRepository<UserEntity> {
  protected tableName = 'users';

  async findByEmail(email: string): Promise<UserEntity | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data as UserEntity;
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .update({
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  }

  async incrementStreak(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const newStreak = user.current_streak + 1;
    await this.update(userId, {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, user.longest_streak),
    } as Partial<UserEntity>);
  }

  async addPoints(userId: string, points: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    await this.update(userId, {
      total_points: user.total_points + points,
    } as Partial<UserEntity>);
  }
}
