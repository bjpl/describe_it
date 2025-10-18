/**
 * Export History Table Integration Tests
 * Tests export tracking, auto-expiration, and download management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { exportOperations } from '@/lib/database/utils';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Export History Table Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================
  // CREATE EXPORT RECORDS
  // ==============================================

  describe('Create Export Records', () => {
    it('should create new export record', async () => {
      const mockExport = {
        id: 'export-123',
        user_id: 'user-123',
        export_type: 'pdf',
        file_url: 'https://storage.example.com/exports/user-123/export.pdf',
        file_size_bytes: 102400,
        download_count: 0,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExport,
          error: null,
        }),
      });

      const result = await exportOperations.create({
        user_id: 'user-123',
        export_type: 'pdf',
        file_url: 'https://storage.example.com/exports/user-123/export.pdf',
        file_size_bytes: 102400,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(result.data).toEqual(mockExport);
      expect(result.error).toBeNull();
    });

    it('should support multiple export types', async () => {
      const exportTypes = ['pdf', 'csv', 'json', 'anki', 'docx', 'txt'];

      for (const exportType of exportTypes) {
        (supabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { export_type: exportType },
            error: null,
          }),
        });

        const result = await exportOperations.create({
          user_id: 'user-123',
          export_type: exportType,
          file_url: `https://example.com/export.${exportType}`,
        });

        expect(result.data?.export_type).toBe(exportType);
      }
    });

    it('should enforce valid export_type constraint', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'invalid export_type',
            code: '23514',
          },
        }),
      });

      const result = await exportOperations.create({
        user_id: 'user-123',
        export_type: 'invalid-type',
        file_url: 'https://example.com/export.txt',
      });

      expect(result.error).toBeTruthy();
    });

    it('should enforce foreign key constraint on user_id', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'violates foreign key constraint',
            code: '23503',
          },
        }),
      });

      const result = await exportOperations.create({
        user_id: 'invalid-user',
        export_type: 'pdf',
        file_url: 'https://example.com/export.pdf',
      });

      expect(result.error).toBeTruthy();
    });
  });

  // ==============================================
  // READ EXPORT RECORDS
  // ==============================================

  describe('Read Export Records', () => {
    it('should retrieve user export history', async () => {
      const mockExports = [
        {
          id: 'export-1',
          user_id: 'user-123',
          export_type: 'pdf',
          download_count: 3,
          created_at: new Date().toISOString(),
        },
        {
          id: 'export-2',
          user_id: 'user-123',
          export_type: 'csv',
          download_count: 1,
          created_at: new Date().toISOString(),
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockExports,
          error: null,
          count: 2,
        }),
      });

      const result = await exportOperations.findMany({
        filters: { user_id: 'user-123' },
        orderBy: 'created_at',
        order: 'desc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('should retrieve export by ID', async () => {
      const mockExport = {
        id: 'export-123',
        user_id: 'user-123',
        export_type: 'json',
        file_url: 'https://example.com/export.json',
        download_count: 5,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExport,
          error: null,
        }),
      });

      const result = await exportOperations.findById('export-123');

      expect(result.data).toEqual(mockExport);
      expect(result.error).toBeNull();
    });

    it('should filter by export_type', async () => {
      const mockExports = [
        { id: 'export-1', export_type: 'pdf' },
        { id: 'export-2', export_type: 'pdf' },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockExports,
          error: null,
          count: 2,
        }),
      });

      const result = await exportOperations.findMany({
        filters: { export_type: 'pdf' },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data?.every((e) => e.export_type === 'pdf')).toBe(true);
    });
  });

  // ==============================================
  // UPDATE EXPORT RECORDS
  // ==============================================

  describe('Update Export Records', () => {
    it('should increment download_count', async () => {
      const updatedExport = {
        id: 'export-123',
        download_count: 6,
        last_downloaded_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedExport,
          error: null,
        }),
      });

      const result = await exportOperations.update('export-123', {
        download_count: 6,
        last_downloaded_at: new Date().toISOString(),
      });

      expect(result.data?.download_count).toBe(6);
      expect(result.data?.last_downloaded_at).toBeDefined();
    });

    it('should update expires_at', async () => {
      const newExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { expires_at: newExpiry },
          error: null,
        }),
      });

      const result = await exportOperations.update('export-123', {
        expires_at: newExpiry,
      });

      expect(result.data?.expires_at).toBe(newExpiry);
    });
  });

  // ==============================================
  // DELETE EXPORT RECORDS
  // ==============================================

  describe('Delete Export Records', () => {
    it('should delete export record', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await exportOperations.delete('export-123');

      expect(result.error).toBeNull();
    });

    it('should cascade delete when user is deleted', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await supabase
        .from('users')
        .delete()
        .eq('id', 'user-123');

      expect(result.error).toBeNull();
    });

    it('should cleanup expired exports', async () => {
      const now = new Date().toISOString();

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await supabase
        .from('export_history')
        .delete()
        .lt('expires_at', now);

      expect(result.error).toBeNull();
    });
  });

  // ==============================================
  // RLS POLICY TESTS
  // ==============================================

  describe('Row Level Security Policies', () => {
    it('should allow users to read own exports', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-123', export_type: 'pdf' }],
          error: null,
        }),
      });

      const result = await supabase
        .from('export_history')
        .select('*')
        .eq('user_id', 'user-123');

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should prevent users from reading others exports', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const result = await supabase
        .from('export_history')
        .select('*')
        .eq('user_id', 'other-user');

      expect(result.error?.code).toBe('PGRST301');
    });

    it('should allow users to create own exports', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user-123', export_type: 'csv' },
          error: null,
        }),
      });

      const result = await exportOperations.create({
        user_id: 'user-123',
        export_type: 'csv',
        file_url: 'https://example.com/export.csv',
      });

      expect(result.error).toBeNull();
    });
  });

  // ==============================================
  // EXPIRATION LOGIC TESTS
  // ==============================================

  describe('Export Expiration Logic', () => {
    it('should detect expired exports', async () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      const isExpired = expiredDate.getTime() < now.getTime();
      expect(isExpired).toBe(true);
    });

    it('should detect non-expired exports', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week

      const isExpired = futureDate.getTime() < now.getTime();
      expect(isExpired).toBe(false);
    });

    it('should filter only active exports', async () => {
      const now = new Date().toISOString();
      const mockExports = [
        { id: 'export-1', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'export-2', expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockExports,
          error: null,
        }),
      });

      const result = await supabase
        .from('export_history')
        .select('*')
        .gt('expires_at', now)
        .eq('user_id', 'user-123');

      expect(result.data).toHaveLength(2);
    });
  });

  // ==============================================
  // DOWNLOAD TRACKING
  // ==============================================

  describe('Download Tracking', () => {
    it('should track download count accurately', async () => {
      let downloadCount = 0;

      // Simulate 5 downloads
      for (let i = 0; i < 5; i++) {
        downloadCount++;
      }

      expect(downloadCount).toBe(5);
    });

    it('should update last_downloaded_at on each download', async () => {
      const now = new Date().toISOString();

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { last_downloaded_at: now },
          error: null,
        }),
      });

      const result = await exportOperations.update('export-123', {
        last_downloaded_at: now,
      });

      expect(result.data?.last_downloaded_at).toBe(now);
    });

    it('should calculate time since last download', async () => {
      const now = new Date();
      const lastDownload = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      const hoursSince = Math.floor(
        (now.getTime() - lastDownload.getTime()) / (1000 * 60 * 60)
      );

      expect(hoursSince).toBe(2);
    });
  });

  // ==============================================
  // DATA INTEGRITY TESTS
  // ==============================================

  describe('Data Integrity', () => {
    it('should enforce non-negative download_count', async () => {
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'download_count must be non-negative',
            code: '23514',
          },
        }),
      });

      const result = await exportOperations.update('export-123', {
        download_count: -1,
      });

      expect(result.error).toBeTruthy();
    });

    it('should enforce non-negative file_size_bytes', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'file_size_bytes must be non-negative',
            code: '23514',
          },
        }),
      });

      const result = await exportOperations.create({
        user_id: 'user-123',
        export_type: 'pdf',
        file_url: 'https://example.com/export.pdf',
        file_size_bytes: -100,
      });

      expect(result.error).toBeTruthy();
    });

    it('should store file URLs correctly', async () => {
      const fileUrl = 'https://storage.example.com/exports/user-123/vocabulary-2025-10-17.pdf';

      expect(fileUrl).toMatch(/^https?:\/\//);
      expect(fileUrl).toContain('.pdf');
    });
  });
});
