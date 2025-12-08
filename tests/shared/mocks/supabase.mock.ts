/**
 * Supabase Mock Factory
 * Provides configurable Supabase client mocks for integration testing
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MockSupabaseConfig {
  authBehavior?: 'success' | 'unauthenticated' | 'error';
  databaseBehavior?: 'success' | 'error' | 'empty';
  storageBehavior?: 'success' | 'error';
}

/**
 * Create a mock Supabase client with configurable behavior
 */
export function createMockSupabase(config: MockSupabaseConfig = {}): any {
  const {
    authBehavior = 'success',
    databaseBehavior = 'success',
    storageBehavior = 'success',
  } = config;

  return {
    auth: createAuthMock(authBehavior),
    from: vi.fn((table: string) => createQueryBuilderMock(table, databaseBehavior)),
    storage: createStorageMock(storageBehavior),
    rpc: createRpcMock(),
    schema: vi.fn().mockReturnThis(),
    realtime: {
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
      getChannels: vi.fn().mockReturnValue([]),
    },
  };
}

/**
 * Create auth mock
 */
function createAuthMock(behavior: 'success' | 'unauthenticated' | 'error') {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  switch (behavior) {
    case 'success':
      return {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      };

    case 'unauthenticated':
      return {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Sign up failed' },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      };

    case 'error':
      return {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: 'Auth error' },
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth error' },
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Auth error' },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Auth error' },
        }),
        signOut: vi.fn().mockResolvedValue({
          error: { message: 'Auth error' },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      };
  }
}

/**
 * Create query builder mock
 */
function createQueryBuilderMock(
  table: string,
  behavior: 'success' | 'error' | 'empty'
) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    returns: vi.fn().mockReturnThis(),
  };

  switch (behavior) {
    case 'success':
      return {
        ...chainable,
        single: vi.fn().mockResolvedValue({
          data: { id: 'mock-id', table },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'mock-id', table },
          error: null,
        }),
        then: vi.fn().mockResolvedValue({
          data: [{ id: 'mock-id', table }],
          error: null,
        }),
      };

    case 'empty':
      return {
        ...chainable,
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        then: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

    case 'error':
      return {
        ...chainable,
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
        then: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };
  }
}

/**
 * Create storage mock
 */
function createStorageMock(behavior: 'success' | 'error') {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue(
        behavior === 'success'
          ? { data: { path: 'mock-path' }, error: null }
          : { data: null, error: { message: 'Upload failed' } }
      ),
      download: vi.fn().mockResolvedValue(
        behavior === 'success'
          ? { data: new Blob(['test']), error: null }
          : { data: null, error: { message: 'Download failed' } }
      ),
      list: vi.fn().mockResolvedValue(
        behavior === 'success'
          ? { data: [], error: null }
          : { data: null, error: { message: 'List failed' } }
      ),
      remove: vi.fn().mockResolvedValue(
        behavior === 'success'
          ? { data: [], error: null }
          : { data: null, error: { message: 'Remove failed' } }
      ),
      createSignedUrl: vi.fn().mockResolvedValue(
        behavior === 'success'
          ? { data: { signedUrl: 'mock-url' }, error: null }
          : { data: null, error: { message: 'Create URL failed' } }
      ),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'mock-public-url' },
      }),
    }),
  };
}

/**
 * Create RPC mock
 */
function createRpcMock() {
  return vi.fn().mockResolvedValue({
    data: null,
    error: null,
  });
}

/**
 * Mock Supabase module
 */
export function mockSupabaseModule(config: MockSupabaseConfig = {}): void {
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => createMockSupabase(config)),
  }));
}

/**
 * Reset all Supabase mocks
 */
export function resetSupabaseMocks(): void {
  vi.clearAllMocks();
}
