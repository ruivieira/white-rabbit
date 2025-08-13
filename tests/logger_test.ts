// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { initLogger, LogLevel, reconfigureLogger } from "../src/logger.ts";

Deno.test("Logger configuration - default level is INFO", () => {
  const logger = initLogger("test");
  assertEquals(logger.config.level, LogLevel.INFO);
});

Deno.test("Logger configuration - supports DEBUG level", () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "DEBUG");

  try {
    // Reconfigure the logger to pick up the new environment variable
    reconfigureLogger();

    // Create a new logger instance to pick up the environment variable
    const logger = initLogger("test");
    assertEquals(logger.config.level, LogLevel.DEBUG);
  } finally {
    // Restore original environment
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
  }
});

Deno.test("Logger configuration - supports INFO level", () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "INFO");

  try {
    // Reconfigure the logger to pick up the new environment variable
    reconfigureLogger();

    // Create a new logger instance to pick up the environment variable
    const logger = initLogger("test");
    assertEquals(logger.config.level, LogLevel.INFO);
  } finally {
    // Restore original environment
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
  }
});

Deno.test("Logger configuration - WR_LOG_LEVEL configuration", () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "DEBUG");

  try {
    // Reconfigure the logger to pick up the new environment variable
    reconfigureLogger();

    // Create a new logger instance to pick up the environment variable
    const logger = initLogger("test");
    assertEquals(logger.config.level, LogLevel.DEBUG);
  } finally {
    // Restore original environment
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
  }
});

Deno.test("Logger configuration - case insensitive level parsing", () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "debug");

  try {
    // Reconfigure the logger to pick up the new environment variable
    reconfigureLogger();

    // Create a new logger instance to pick up the environment variable
    const logger = initLogger("test");
    assertEquals(logger.config.level, LogLevel.DEBUG);
  } finally {
    // Restore original environment
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
  }
});

Deno.test("Logger configuration - invalid level falls back to default", () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "INVALID_LEVEL");

  try {
    // Reconfigure the logger to pick up the new environment variable
    reconfigureLogger();

    // Create a new logger instance to pick up the environment variable
    const logger = initLogger("test");
    assertEquals(logger.config.level, LogLevel.INFO); // Default level
  } finally {
    // Restore original environment
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
  }
});

Deno.test("Logger level filtering - DEBUG level shows all messages", () => {
  const logger = new (initLogger("test").constructor as any)({ level: LogLevel.DEBUG });

  let debugLogged = false;
  let infoLogged = false;

  // Mock console.log to capture output
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (msg: string) => {
      if (msg.includes("DEBUG")) debugLogged = true;
      if (msg.includes("INFO")) infoLogged = true;
    };
    console.error = () => {}; // Suppress error output

    logger.debug("Debug message");
    logger.info("Info message");

    assert(debugLogged, "DEBUG message should be logged when level is DEBUG");
    assert(infoLogged, "INFO message should be logged when level is DEBUG");
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});

Deno.test("Logger level filtering - INFO level hides DEBUG messages", () => {
  const logger = new (initLogger("test").constructor as any)({ level: LogLevel.INFO });

  let debugLogged = false;
  let infoLogged = false;

  // Mock console.log to capture output
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (msg: string) => {
      if (msg.includes("DEBUG")) debugLogged = true;
      if (msg.includes("INFO")) infoLogged = true;
    };
    console.error = () => {}; // Suppress error output

    logger.debug("Debug message");
    logger.info("Info message");

    assert(!debugLogged, "DEBUG message should not be logged when level is INFO");
    assert(infoLogged, "INFO message should be logged when level is INFO");
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});
