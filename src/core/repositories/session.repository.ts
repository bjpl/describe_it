import { BaseRepository, BaseEntity } from './base.repository';

export interface SessionEntity extends BaseEntity {
  user_id: string;
  session_type: 'practice' | 'flashcards' | 'quiz' | 'matching' | 'writing';
  status: 'active' | 'completed' | 'abandoned';
  vocabulary_items?: string[];
  score?: number;
  accuracy?: number;
  time_spent?: number;
  session_data?: any;
  device_info?: any;
  started_at: string;
  completed_at?: string;
}

export class SessionRepository extends BaseRepository<SessionEntity> {
  protected tableName = 'sessions';

  async findActiveByUser(userId: string): Promise<SessionEntity[]> {
    const { data } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    return (data as SessionEntity[]) ?? [];
  }

  async findByUser(userId: string, limit: number = 10): Promise<SessionEntity[]> {
    const { data } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    return (data as SessionEntity[]) ?? [];
  }

  async completeSession(
    sessionId: string,
    sessionData: {
      score?: number;
      accuracy?: number;
      time_spent?: number;
    }
  ): Promise<SessionEntity> {
    return this.update(sessionId, {
      ...sessionData,
      status: 'completed',
      completed_at: new Date().toISOString(),
    } as Partial<SessionEntity>);
  }

  async abandonSession(sessionId: string): Promise<SessionEntity> {
    return this.update(sessionId, {
      status: 'abandoned',
      completed_at: new Date().toISOString(),
    } as Partial<SessionEntity>);
  }
}
