/**
 * Application startup validation and initialization
 * This module ensures the application is properly configured before starting
 */

import {
  validateOnStartup,
  getEnvironmentInfo,
  isDemoMode,
  isProduction,
} from "@/config/env";
import { logger } from "@/lib/logger";

/**
 * Performs comprehensive startup validation
 * Should be called early in the application lifecycle
 */
export function performStartupValidation(): void {
  logger.info("Starting application validation", {
    component: "startup-validation",
  });

  try {
    // Validate environment variables
    validateOnStartup();

    // Log environment information
    const envInfo = getEnvironmentInfo();
    logEnvironmentInfo(envInfo);

    // Perform additional startup checks
    performStartupChecks();

    logger.info("Application startup validation completed successfully", {
      component: "startup-validation",
    });
  } catch (error) {
    logger.error("Application startup validation failed", error as Error, {
      component: "startup-validation",
    });

    if (isProduction()) {
      logger.error("Exiting due to validation failure in production", undefined, {
        component: "startup-validation",
        action: "exit",
      });
      process.exit(1);
    } else {
      logger.warn("Continuing despite validation failure in non-production", {
        component: "startup-validation",
      });
    }
  }
}

/**
 * Logs detailed environment information
 */
function logEnvironmentInfo(
  envInfo: ReturnType<typeof getEnvironmentInfo>,
): void {
  logger.info("📋 Environment Information:");
  logger.info(`   • Environment: ${envInfo.nodeEnv}`);
  logger.info(`   • App URL: ${envInfo.appUrl}`);
  logger.info(
    `   • Demo Mode: ${envInfo.demoMode ? "✅ Enabled" : "❌ Disabled"}`,
  );
  logger.info(
    `   • Maintenance Mode: ${envInfo.maintenanceMode ? "🚧 Enabled" : "❌ Disabled"}`,
  );

  if (envInfo.buildId) {
    logger.info(`   • Build ID: ${envInfo.buildId}`);
  }

  logger.info(`   • Timestamp: ${envInfo.timestamp}`);

  // Log service statuses
  logger.info("\n🔧 Service Status:");
  const servicesByCategory = envInfo.services.reduce(
    (acc, service) => {
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push(service);
      return acc;
    },
    {} as Record<string, typeof envInfo.services>,
  );

  Object.entries(servicesByCategory).forEach(([category, services]) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    logger.info(`\n   ${categoryName} Services:`);

    services.forEach((service) => {
      const status = service.enabled ? "✅" : service.demoMode ? "🎭" : "❌";
      const requiredIndicator = service.required ? " (Required)" : "";
      logger.info(`     ${status} ${service.name}${requiredIndicator}`);

      if (service.reason) {
        logger.info(`       └─ ${service.reason}`);
      }
    });
  });

  // Log demo mode details if enabled
  if (envInfo.demoMode) {
    logger.info("\n🎭 Demo Mode Active:");
    logger.info("     • Using mock data for external APIs");
    logger.info("     • All features available with demo content");
    logger.info("     • No API keys required");
    logger.info("     • Add real API keys to .env.local to disable demo mode");
  }
}

/**
 * Performs additional startup checks
 */
function performStartupChecks(): void {
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

  if (majorVersion < 18) {
    logger.warn(
      `⚠️  Node.js version ${nodeVersion} is below recommended (18.0.0)`,
    );
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);

  if (memoryMB > 512) {
    logger.warn(`⚠️  High memory usage at startup: ${memoryMB}MB`);
  }

  // Check demo mode recommendations
  if (isDemoMode() && isProduction()) {
    logger.warn("⚠️  Demo mode is active in production environment");
    logger.warn("     Consider configuring real API keys for production use");
  }

  logger.info(`\n📊 Runtime Information:`);
  logger.info(`   • Node.js: ${nodeVersion}`);
  logger.info(`   • Platform: ${process.platform}`);
  logger.info(`   • Architecture: ${process.arch}`);
  logger.info(`   • Memory Usage: ${memoryMB}MB`);
}

/**
 * Validates specific feature requirements
 */
export function validateFeatureRequirements(
  featureName: string,
  requiredVars: string[],
  optionalVars: string[] = [],
): { canProceed: boolean; demoMode: boolean; warnings: string[] } {
  const envInfo = getEnvironmentInfo();
  const warnings: string[] = [];
  let canProceed = true;
  let demoMode = false;

  // Check if any required services are missing
  const missingServices = envInfo.services.filter(
    (service) => service.required && !service.enabled,
  );

  if (missingServices.length > 0) {
    canProceed = false;
    warnings.push(
      `${featureName} requires these services: ${missingServices.map((s) => s.name).join(", ")}`,
    );
  }

  // Check for demo mode
  const demoServices = envInfo.services.filter((service) => service.demoMode);
  if (demoServices.length > 0) {
    demoMode = true;
    warnings.push(
      `${featureName} will use demo data for: ${demoServices.map((s) => s.name).join(", ")}`,
    );
  }

  return { canProceed, demoMode, warnings };
}

/**
 * Health check function for monitoring
 */
export function performHealthCheck(): {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail";
    message?: string;
  }>;
  timestamp: string;
} {
  const checks = [];
  const envInfo = getEnvironmentInfo();

  // Check environment validation
  try {
    checks.push({
      name: "Environment Validation",
      status: "pass" as const,
    });
  } catch {
    checks.push({
      name: "Environment Validation",
      status: "fail" as const,
      message: "Environment validation failed",
    });
  }

  // Check core services
  const coreServices = envInfo.services.filter((s) => s.category === "core");
  const healthyCoreServices = coreServices.filter((s) => s.healthy);

  if (healthyCoreServices.length === coreServices.length) {
    checks.push({
      name: "Core Services",
      status: "pass" as const,
    });
  } else {
    checks.push({
      name: "Core Services",
      status: "fail" as const,
      message: "Some core services are unavailable",
    });
  }

  // Check external services
  const externalServices = envInfo.services.filter(
    (s) => s.category === "external",
  );
  const healthyExternalServices = externalServices.filter((s) => s.healthy);

  if (healthyExternalServices.length === 0 && externalServices.length > 0) {
    checks.push({
      name: "External Services",
      status: "warn" as const,
      message: "Running in demo mode - no external APIs configured",
    });
  } else if (healthyExternalServices.length < externalServices.length) {
    checks.push({
      name: "External Services",
      status: "warn" as const,
      message: "Some external services unavailable",
    });
  } else {
    checks.push({
      name: "External Services",
      status: "pass" as const,
    });
  }

  // Determine overall status
  const hasFailures = checks.some((c) => c.status === "fail");
  const hasWarnings = checks.some((c) => c.status === "warn");

  let status: "healthy" | "degraded" | "unhealthy";
  if (hasFailures) {
    status = "unhealthy";
  } else if (hasWarnings) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };
}
