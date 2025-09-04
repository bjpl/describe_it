import { NextResponse } from "next/server";
import {
  getEnvironmentInfo,
  validationResult,
  isDemoMode,
  isProduction,
} from "@/config/env";
import { performHealthCheck } from "@/lib/startup-validation";

/**
 * Environment Status API Endpoint
 * Provides comprehensive information about environment configuration,
 * service status, and application health for monitoring and debugging.
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get("detailed") === "true";
    const healthOnly = url.searchParams.get("health") === "true";

    // If only health check is requested
    if (healthOnly) {
      const healthCheck = performHealthCheck();
      return NextResponse.json(healthCheck, {
        status:
          healthCheck.status === "healthy"
            ? 200
            : healthCheck.status === "degraded"
              ? 200
              : 503,
      });
    }

    // Get environment information
    const envInfo = getEnvironmentInfo();
    const healthCheck = performHealthCheck();

    // Basic response
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: envInfo.nodeEnv,
      demoMode: envInfo.demoMode,
      maintenanceMode: envInfo.maintenanceMode,
      health: healthCheck,
      services: {
        total: envInfo.services.length,
        enabled: envInfo.services.filter((s) => s.enabled).length,
        demo: envInfo.services.filter((s) => s.demoMode).length,
        healthy: envInfo.services.filter((s) => s.healthy).length,
      },
    };

    // Add detailed information if requested
    if (detailed) {
      const detailedResponse = {
        ...response,
        details: {
          appUrl: envInfo.appUrl,
          buildId: envInfo.buildId,
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          uptime: Math.floor(process.uptime()),
          memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapTotal: Math.round(
              process.memoryUsage().heapTotal / 1024 / 1024,
            ),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          },
          services: envInfo.services,
          validation: {
            success: validationResult?.success || false,
            errors: validationResult?.errors || [],
            warnings: validationResult?.warnings || [],
          },
        },
      };

      return NextResponse.json(detailedResponse, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Environment": envInfo.nodeEnv,
          "X-Demo-Mode": envInfo.demoMode.toString(),
          "X-Health-Status": healthCheck.status,
        },
      });
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=60", // Cache basic status for 1 minute
        "X-Environment": envInfo.nodeEnv,
        "X-Demo-Mode": envInfo.demoMode.toString(),
        "X-Health-Status": healthCheck.status,
      },
    });
  } catch (error) {
    console.error("Environment status check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve environment status",
        error: isProduction() ? "Internal server error" : String(error),
        timestamp: new Date().toISOString(),
        demoMode: isDemoMode(),
      },
      {
        status: 500,
        headers: {
          "X-Environment": process.env.NODE_ENV || "unknown",
          "X-Demo-Mode": isDemoMode().toString(),
          "X-Health-Status": "unhealthy",
        },
      },
    );
  }
}

// Export the same handler for all HTTP methods for convenience
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
