// Service layer setup with dependency injection
import { UserService } from '@/core/services/user.service';
import { SessionService } from '@/core/services/session.service';
import { userRepository, sessionRepository } from './database';

// Create service instances with injected repositories
export const userService = new UserService(userRepository);
export const sessionService = new SessionService(sessionRepository, userRepository);

// Re-export for convenience
export { UserService, SessionService };
