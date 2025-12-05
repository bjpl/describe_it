// Database infrastructure setup
import { supabase } from '@/lib/supabase/client';
import { UserRepository } from '@/core/repositories/user.repository';
import { SessionRepository } from '@/core/repositories/session.repository';

// Create repository instances with the singleton Supabase client
export const userRepository = new UserRepository(supabase);
export const sessionRepository = new SessionRepository(supabase);

// Re-export for convenience
export { supabase };
