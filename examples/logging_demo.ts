#!/usr/bin/env -S deno run -A

/**
 * White Rabbit Logging Demo
 *
 * This script demonstrates the different logging levels and their effects
 * on HTTP request logging.
 */

import { reconfigureLogger } from "../src/logger.ts";

console.log("🐰 White Rabbit Logging Demo");
console.log("============================\n");

// Function to make a test request
async function makeTestRequest() {
  const url = "http://localhost:8000/v1/chat/completions";
  const body = {
    model: "test-model",
    messages: [{ role: "user", content: "Hello, how are you?" }],
    max_tokens: 20,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Request successful");
      console.log(`   Generated ${data.usage?.completion_tokens || 0} tokens\n`);
    } else {
      console.log(`❌ Request failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Request error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Demo 1: INFO level (default)
console.log("1. INFO Level Logging (Default)");
console.log("   Set: WR_LOG_LEVEL=INFO");
console.log("   Expected: Basic request processing logs, NO detailed request logging\n");

Deno.env.set("WR_LOG_LEVEL", "INFO");
reconfigureLogger();

console.log("Making test request with INFO level...");
await makeTestRequest();

// Demo 2: DEBUG level
console.log("\n2. DEBUG Level Logging");
console.log("   Set: WR_LOG_LEVEL=DEBUG");
console.log("   Expected: Detailed HTTP request logging with headers and body\n");

Deno.env.set("WR_LOG_LEVEL", "DEBUG");
reconfigureLogger();

console.log("Making test request with DEBUG level...");
await makeTestRequest();

// Demo 3: WARNING level
console.log("\n3. WARNING Level Logging");
console.log("   Set: WR_LOG_LEVEL=WARNING");
console.log("   Expected: Only warnings and errors, minimal logging\n");

Deno.env.set("WR_LOG_LEVEL", "WARNING");
reconfigureLogger();

console.log("Making test request with WARNING level...");
await makeTestRequest();

// Demo 4: ERROR level
console.log("\n4. ERROR Level Logging");
console.log("   Set: WR_LOG_LEVEL=ERROR");
console.log("   Expected: Only error messages, very minimal logging\n");

Deno.env.set("WR_LOG_LEVEL", "ERROR");
reconfigureLogger();

console.log("Making test request with ERROR level...");
await makeTestRequest();

// Reset to default
console.log("\n5. Resetting to Default (INFO)");
Deno.env.set("WR_LOG_LEVEL", "INFO");
reconfigureLogger();

console.log("✅ Demo complete!");
console.log("\nTo run this demo:");
console.log("1. Start White Rabbit server: deno task start");
console.log("2. In another terminal: deno run -A examples/logging_demo.ts");
console.log("\nEnvironment Variables:");
console.log("- WR_LOG_LEVEL=DEBUG    - Detailed request logging");
console.log("- WR_LOG_LEVEL=INFO     - Standard logging (default)");
console.log("- WR_LOG_LEVEL=WARNING  - Warnings and errors only");
console.log("- WR_LOG_LEVEL=ERROR    - Errors only");
