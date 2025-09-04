/**
 * Application startup initialization
 * This module performs environment validation and setup before the app starts
 */

import { performStartupValidation } from "@/lib/startup-validation";
import { logger } from "@/lib/logger";

/**
 * Initialize the application on startup
 * This runs when the module is first loaded
 */
function initializeApp() {
  // Only run startup validation on server side
  if (typeof window === "undefined") {
    try {
      performStartupValidation();
    } catch (error) {
      logger.error(
        "Failed to initialize application",
        error instanceof Error ? error : new Error(String(error)),
        {
          component: "startup",
          phase: "initialization",
        },
      );
      // Don't exit in development for better DX
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
  }
}

// Run initialization
initializeApp();

// Export for explicit initialization if needed
export { performStartupValidation };
export default initializeApp;
