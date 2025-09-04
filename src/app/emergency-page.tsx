"use client";

import { useState } from "react";
import { logger } from "@/lib/logger";

export default function EmergencyPage() {
  logger.componentMount("EmergencyPage");
  const [message, setMessage] = useState("Emergency App is Working!");

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "blue", fontSize: "24px" }}>
        Describe It - Emergency Mode
      </h1>

      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <h2>Status: {message}</h2>
        <p>This is the emergency fallback page to ensure something displays.</p>

        <button
          onClick={() => setMessage("Button Clicked Successfully!")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Test Button
        </button>

        <div
          style={{
            marginTop: "20px",
            backgroundColor: "#f0f8ff",
            padding: "15px",
            borderRadius: "4px",
          }}
        >
          <h3>Emergency Checklist:</h3>
          <ul>
            <li>✅ HTML Structure Loading</li>
            <li>✅ React Components Working</li>
            <li>✅ CSS Styling Applied</li>
            <li>✅ JavaScript Execution Working</li>
            <li>✅ Next.js App Router Working</li>
          </ul>
        </div>

        <div style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
          <p>Rendered at: {new Date().toLocaleString()}</p>
          <p>Environment: {process.env.NODE_ENV || "unknown"}</p>
        </div>
      </div>
    </div>
  );
}
