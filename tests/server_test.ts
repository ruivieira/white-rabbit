// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleRequest } from "../src/server.ts";
import { reconfigureLogger } from "../src/logger.ts";

async function makeTestRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `http://localhost:8000${path}`;
  const req = new Request(url, {
    headers: { "content-type": "application/json", ...options.headers },
    ...options,
  });
  return await handleRequest(req);
}

Deno.test("Health endpoint", async () => {
  const response = await makeTestRequest("/health");
  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data, { status: "ok" });
});

Deno.test("Chat completions endpoint - basic request", async () => {
  const requestBody = {
    model: "test-model",
    messages: [
      { role: "user", content: "Hello world" },
    ],
    max_tokens: 50,
    n: 1,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertExists(data.id);
  assertEquals(data.object, "chat.completion");
  assertEquals(data.model, "Qwen/Qwen2.5-1.5B-Instruct");
  assertExists(data.created);
  assertExists(data.system_fingerprint);
  assertEquals(data.choices.length, 1);

  const choice = data.choices[0];
  assertEquals(choice.index, 0);
  assertEquals(choice.message.role, "assistant");
  assertExists(choice.message.content);
  assertEquals(choice.message.refusal, null);
  assert(["stop", "length"].includes(choice.finish_reason));

  assertExists(data.usage);
  assert(typeof data.usage.prompt_tokens === "number");
  assert(typeof data.usage.completion_tokens === "number");
  assert(typeof data.usage.total_tokens === "number");
});

Deno.test("Chat completions endpoint - with logprobs", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Test" }],
    logprobs: true,
    max_tokens: 20,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.logprobs);
  assertExists(choice.logprobs.content);
  assert(Array.isArray(choice.logprobs.content));

  if (choice.logprobs.content.length > 0) {
    const logprob = choice.logprobs.content[0];
    assertExists(logprob.token);
    assert(typeof logprob.logprob === "number");
    assert(logprob.logprob <= 0); // Logprobs should be negative
    assert(Array.isArray(logprob.bytes));
    assert(Array.isArray(logprob.top_logprobs));
  }
});

Deno.test("Chat completions endpoint - multiple choices", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Generate text" }],
    n: 3,
    max_tokens: 30,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertEquals(data.choices.length, 3);

  data.choices.forEach((choice: any, index: number) => {
    assertEquals(choice.index, index);
    assertExists(choice.message.content);
  });
});

Deno.test("Completions endpoint - basic request", async () => {
  const requestBody = {
    model: "test-model",
    prompt: "Once upon a time",
    max_tokens: 50,
    n: 1,
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  assertExists(data.id);
  assertEquals(data.object, "chat.completion");
  assertEquals(data.model, "Qwen/Qwen2.5-1.5B-Instruct");
  assertExists(data.created);
  assertExists(data.system_fingerprint);
  assertEquals(data.choices.length, 1);

  const choice = data.choices[0];
  assertEquals(choice.index, 0);
  assertExists(choice.text);
  assert(["stop", "length"].includes(choice.finish_reason));
});

Deno.test("Completions endpoint - with echo", async () => {
  const promptText = "The quick brown fox";
  const requestBody = {
    model: "test-model",
    prompt: promptText,
    echo: true,
    max_tokens: 30,
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assert(choice.text.startsWith(promptText));
});

Deno.test("Completions endpoint - with logprobs", async () => {
  const requestBody = {
    model: "test-model",
    prompt: "Test prompt",
    logprobs: true,
    max_tokens: 20,
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.logprobs);
  assertExists(choice.logprobs.tokens);
  assertExists(choice.logprobs.token_logprobs);
  assertExists(choice.logprobs.text_offset);
  assertExists(choice.logprobs.top_logprobs);

  assert(Array.isArray(choice.logprobs.tokens));
  assert(Array.isArray(choice.logprobs.token_logprobs));
  assert(Array.isArray(choice.logprobs.text_offset));
  assert(Array.isArray(choice.logprobs.top_logprobs));

  // All arrays should have same length
  const length = choice.logprobs.tokens.length;
  assertEquals(choice.logprobs.token_logprobs.length, length);
  assertEquals(choice.logprobs.text_offset.length, length);
  assertEquals(choice.logprobs.top_logprobs.length, length);
});

Deno.test("Error handling - invalid chat completions request", async () => {
  // Missing required fields
  const requestBody = {
    model: "test-model",
    // missing messages
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 400);

  const data = await response.json();
  assertExists(data.error);
});

Deno.test("Error handling - invalid completions request", async () => {
  // Missing required fields
  const requestBody = {
    model: "test-model",
    // missing prompt
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 400);

  const data = await response.json();
  assertExists(data.error);
});

Deno.test("Error handling - 404 for unknown endpoint", async () => {
  const response = await makeTestRequest("/unknown");

  assertEquals(response.status, 404);

  const data = await response.json();
  assertExists(data.error);
});

Deno.test("Error handling - invalid JSON", async () => {
  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: "invalid json{",
  });

  assertEquals(response.status, 400);

  const data = await response.json();
  assertExists(data.error);
});

Deno.test("Completions endpoint - no first word repetition", async () => {
  const promptText = "One upon a time";
  const requestBody = {
    model: "test-model",
    prompt: promptText,
    max_tokens: 10,
    n: 1,
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.text);

  // The generated text should not start with "One" (first word from prompt)
  const firstWord = choice.text.trim().split(/\s+/)[0]?.toLowerCase();
  assert(
    firstWord !== "one",
    `Generated text "${choice.text}" should not start with "one" from prompt "${promptText}"`,
  );
});

Deno.test("Completions endpoint - max tokens validation", async () => {
  const maxTokens = 5;
  const requestBody = {
    model: "test-model",
    prompt: "The quick brown fox jumps over the lazy dog",
    max_tokens: maxTokens,
    n: 1,
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.text);

  const tokens = choice.text.trim().split(/\s+/);
  assert(
    tokens.length <= maxTokens,
    `Generated ${tokens.length} tokens, expected <= ${maxTokens}. Text: "${choice.text}"`,
  );

  if (tokens.length === maxTokens) {
    assertEquals(choice.finish_reason, "length", "Should indicate length limit was reached");
  }
});

Deno.test("Completions endpoint - various max token sizes", async () => {
  const testCases = [1, 3, 8, 15];

  for (const maxTokens of testCases) {
    const requestBody = {
      model: "test-model",
      prompt: "Generate some text",
      max_tokens: maxTokens,
      n: 1,
    };

    const response = await makeTestRequest("/v1/completions", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    assertEquals(response.status, 200);

    const data = await response.json();
    const choice = data.choices[0];
    const tokens = choice.text.trim().split(/\s+/);

    assert(
      tokens.length <= maxTokens,
      `maxTokens=${maxTokens}: Generated ${tokens.length} tokens, expected <= ${maxTokens}`,
    );
  }
});

Deno.test("Chat completions endpoint - max tokens strictly respected", async () => {
  const maxTokens = 50;
  const requestBody = {
    model: "test-model",
    messages: [
      { role: "user", content: "Please generate a long response about philosophy and science" },
    ],
    max_tokens: maxTokens,
    n: 1,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.message.content);

  const tokens = choice.message.content.trim().split(/\s+/);

  // Should generate close to max_tokens (allow some tolerance for edge cases)
  assert(tokens.length <= maxTokens, `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);

  // With aggressive fallback, we should consistently get at least 95% of max_tokens
  assert(
    tokens.length >= maxTokens * 0.95,
    `Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${
      Math.round(tokens.length / maxTokens * 100)
    }%)`,
  );

  // Should hit the length limit due to aggressive fallback
  assertEquals(choice.finish_reason, "length", "Should hit length limit with aggressive fallback");
});

Deno.test("Completions endpoint - 95% max tokens requirement", async () => {
  const maxTokens = 40;
  const requestBody = {
    model: "test-model",
    prompt: "Write about technology and innovation in modern society",
    max_tokens: maxTokens,
    n: 1,
  };

  const response = await makeTestRequest("/v1/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.text);

  const tokens = choice.text.trim().split(/\s+/);

  assert(tokens.length <= maxTokens, `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);

  // With aggressive fallback, should generate at least 95% of max_tokens
  assert(
    tokens.length >= maxTokens * 0.95,
    `Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${
      Math.round(tokens.length / maxTokens * 100)
    }%)`,
  );

  // Should hit the length limit due to aggressive fallback
  assertEquals(choice.finish_reason, "length", "Should hit length limit with aggressive fallback");
});

Deno.test("Chat completions endpoint - high max tokens test", async () => {
  const maxTokens = 100;
  const requestBody = {
    model: "test-model",
    messages: [
      { role: "user", content: "Write about artificial intelligence, philosophy, and science" },
    ],
    max_tokens: maxTokens,
    n: 1,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);

  const data = await response.json();
  const choice = data.choices[0];
  assertExists(choice.message.content);

  const tokens = choice.message.content.trim().split(/\s+/);

  assert(tokens.length <= maxTokens, `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);

  // With aggressive fallback, should generate at least 95% of max_tokens
  assert(
    tokens.length >= maxTokens * 0.95,
    `Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${
      Math.round(tokens.length / maxTokens * 100)
    }%)`,
  );

  // Should hit the length limit due to aggressive fallback
  assertEquals(choice.finish_reason, "length", "Should hit length limit with aggressive fallback");
});

Deno.test("Request logging - DEBUG level logs request details", async () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "DEBUG");

  // Reconfigure the logger to pick up the new environment variable
  reconfigureLogger();

  // Capture console output
  let logOutput = "";
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (msg: string) => {
      logOutput += msg + "\n";
    };
    console.error = (msg: string) => {
      logOutput += msg + "\n";
    };

    // Make a request that should trigger logging
    const requestBody = {
      model: "test-model",
      messages: [{ role: "user", content: "Hello world" }],
    };

    const response = await makeTestRequest("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    assertEquals(response.status, 200);

    // Check that request logging occurred
    assert(logOutput.includes("=== HTTP Request Log ==="), "Should log request start marker");
    assert(logOutput.includes("Method: POST"), "Should log HTTP method");
    assert(logOutput.includes("Path: /v1/chat/completions"), "Should log request path");
    assert(logOutput.includes("Body:"), "Should log request body");
    assert(logOutput.includes("Hello world"), "Should log request body content");
    assert(logOutput.includes("=== End Request Log ==="), "Should log request end marker");
  } finally {
    // Restore original environment and console
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
    console.log = originalLog;
    console.error = originalError;
  }
});

Deno.test("Request logging - INFO level does not log request details", async () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "INFO");

  // Reconfigure the logger to pick up the new environment variable
  reconfigureLogger();

  // Capture console output
  let logOutput = "";
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (msg: string) => {
      logOutput += msg + "\n";
    };
    console.error = (msg: string) => {
      logOutput += msg + "\n";
    };

    // Make a request that should NOT trigger detailed logging
    const requestBody = {
      model: "test-model",
      messages: [{ role: "user", content: "Hello world" }],
    };

    const response = await makeTestRequest("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    assertEquals(response.status, 200);

    // Check that detailed request logging did NOT occur
    assert(
      !logOutput.includes("=== HTTP Request Log ==="),
      "Should not log request start marker at INFO level",
    );
    assert(!logOutput.includes("Method: POST"), "Should not log HTTP method at INFO level");
    assert(!logOutput.includes("Body:"), "Should not log request body at INFO level");

    // But basic request processing should still be logged
    assert(
      logOutput.includes("Processing chat completion request"),
      "Should still log processing info",
    );
  } finally {
    // Restore original environment and console
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
    console.log = originalLog;
    console.error = originalError;
  }
});

Deno.test("Request logging - GET requests logged without body", async () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "DEBUG");

  // Reconfigure the logger to pick up the new environment variable
  reconfigureLogger();

  // Capture console output
  let logOutput = "";
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (msg: string) => {
      logOutput += msg + "\n";
    };
    console.error = (msg: string) => {
      logOutput += msg + "\n";
    };

    // Make a GET request
    const response = await makeTestRequest("/health");

    assertEquals(response.status, 200);

    // Check that request logging occurred but without body
    assert(logOutput.includes("=== HTTP Request Log ==="), "Should log request start marker");
    assert(logOutput.includes("Method: GET"), "Should log HTTP method");
    assert(logOutput.includes("Path: /health"), "Should log request path");
    assert(!logOutput.includes("Body:"), "Should not log body for GET requests");
    assert(logOutput.includes("=== End Request Log ==="), "Should log request end marker");
  } finally {
    // Restore original environment and console
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
    console.log = originalLog;
    console.error = originalError;
  }
});

Deno.test("Request logging - handles malformed JSON gracefully", async () => {
  // Set environment variable for this test
  const originalLogLevel = Deno.env.get("WR_LOG_LEVEL");
  Deno.env.set("WR_LOG_LEVEL", "DEBUG");

  // Reconfigure the logger to pick up the new environment variable
  reconfigureLogger();

  // Capture console output
  let logOutput = "";
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (msg: string) => {
      logOutput += msg + "\n";
    };
    console.error = (msg: string) => {
      logOutput += msg + "\n";
    };

    // Make a request with malformed JSON
    const response = await makeTestRequest("/v1/chat/completions", {
      method: "POST",
      body: "invalid json{",
    });

    assertEquals(response.status, 400);

    // Check that request logging occurred and handled the error gracefully
    assert(logOutput.includes("=== HTTP Request Log ==="), "Should log request start marker");
    assert(logOutput.includes("Method: POST"), "Should log HTTP method");
    assert(logOutput.includes("Body: invalid json{"), "Should log the malformed body");
    assert(logOutput.includes("=== End Request Log ==="), "Should log request end marker");
  } finally {
    // Restore original environment and console
    if (originalLogLevel) {
      Deno.env.set("WR_LOG_LEVEL", originalLogLevel);
    } else {
      Deno.env.delete("WR_LOG_LEVEL");
    }
    // Reconfigure back to original settings
    reconfigureLogger();
    console.log = originalLog;
    console.error = originalError;
  }
});

// --- Tool calling tests ---

const sampleTools = [
  {
    type: "function" as const,
    function: {
      name: "search_emails",
      description: "Search for emails matching a query",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "integer", description: "Max results", default: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_email",
      description: "Send an email",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string", description: "Subject line" },
          body: { type: "string", description: "Email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_calendar_events",
      description: "Get calendar events for a date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", format: "date", description: "Date to query" },
          calendar_id: { type: "string", description: "Calendar ID" },
        },
        required: ["date"],
      },
    },
  },
];

Deno.test("Tool calling - tools present generates tool_calls response", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Search for meeting notes" }],
    tools: sampleTools,
    tool_choice: "required" as const,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  const choice = data.choices[0];

  assertEquals(choice.finish_reason, "tool_calls");
  assert(choice.message.tool_calls.length > 0, "Should have at least one tool call");
  assertEquals(choice.message.content, null);
  assertEquals(choice.message.role, "assistant");

  const tc = choice.message.tool_calls[0];
  assert(tc.id.startsWith("call_"), "Tool call ID should start with 'call_'");
  assertEquals(tc.type, "function");
  assert(typeof tc.function.name === "string");
  assert(typeof tc.function.arguments === "string");

  // Arguments should be valid JSON
  const args = JSON.parse(tc.function.arguments);
  assert(typeof args === "object");
});

Deno.test("Tool calling - tool_choice 'none' returns text", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Hello" }],
    tools: sampleTools,
    tool_choice: "none" as const,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  const choice = data.choices[0];

  assert(choice.message.content !== null, "Should have text content");
  assert(!choice.message.tool_calls, "Should not have tool_calls");
  assert(choice.finish_reason === "stop" || choice.finish_reason === "length");
});

Deno.test("Tool calling - specific function choice", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Send an email" }],
    tools: sampleTools,
    tool_choice: { type: "function", function: { name: "send_email" } },
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  const choice = data.choices[0];

  assertEquals(choice.finish_reason, "tool_calls");
  assertEquals(choice.message.tool_calls.length, 1);
  assertEquals(choice.message.tool_calls[0].function.name, "send_email");

  // Check that required arguments are present
  const args = JSON.parse(choice.message.tool_calls[0].function.arguments);
  assertExists(args.to, "Required param 'to' should be present");
  assertExists(args.subject, "Required param 'subject' should be present");
  assertExists(args.body, "Required param 'body' should be present");
});

Deno.test("Tool calling - no tools returns normal text response", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Hello world" }],
    max_tokens: 20,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  const choice = data.choices[0];

  assert(choice.message.content !== null);
  assert(!choice.message.tool_calls);
});

Deno.test("Tool calling - multi-turn with tool results eventually returns text", async () => {
  const messages: Record<string, unknown>[] = [
    { role: "user", content: "Search for meeting notes and send them to Bob" },
  ];

  // Add 10 rounds of fake tool call history to push probability towards text
  for (let i = 0; i < 10; i++) {
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: [{
        id: `call_fake_${i}`,
        type: "function",
        function: { name: "search_emails", arguments: '{"query":"meeting"}' },
      }],
    });
    messages.push({
      role: "tool",
      tool_call_id: `call_fake_${i}`,
      content: JSON.stringify({ results: [] }),
    });
  }

  const requestBody = {
    model: "test-model",
    messages,
    tools: sampleTools,
    tool_choice: "auto" as const,
  };

  // After 10 rounds, the probability of calling tools is very low (10%)
  // Run multiple times to verify at least one returns text
  let gotText = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await makeTestRequest("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (data.choices[0].finish_reason !== "tool_calls") {
      gotText = true;
      break;
    }
  }
  assert(gotText, "After 10 tool rounds, should eventually return text within 20 attempts");
});

Deno.test("Tool calling - generated arguments match schema types", async () => {
  const tools = [{
    type: "function" as const,
    function: {
      name: "create_event",
      description: "Create a calendar event",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", format: "date" },
          duration_minutes: { type: "integer", minimum: 15, maximum: 480 },
          is_recurring: { type: "boolean" },
          attendees: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 3,
          },
        },
        required: ["title", "date", "duration_minutes"],
      },
    },
  }];

  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Create an event" }],
    tools,
    tool_choice: { type: "function", function: { name: "create_event" } },
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);

  // Required fields must be present
  assert(typeof args.title === "string", "title should be a string");
  assert(typeof args.date === "string", "date should be a string");
  assert(typeof args.duration_minutes === "number", "duration_minutes should be a number");
  assert(
    Number.isInteger(args.duration_minutes),
    "duration_minutes should be an integer",
  );

  // Optional fields, if present, should have correct types
  if ("is_recurring" in args) {
    assert(typeof args.is_recurring === "boolean", "is_recurring should be boolean");
  }
  if ("attendees" in args) {
    assert(Array.isArray(args.attendees), "attendees should be an array");
    for (const a of args.attendees) {
      assert(typeof a === "string", "each attendee should be a string");
    }
  }
});

Deno.test("Tool calling - enum parameters pick valid values", async () => {
  const tools = [{
    type: "function" as const,
    function: {
      name: "set_priority",
      description: "Set task priority",
      parameters: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          task_id: { type: "string" },
        },
        required: ["priority", "task_id"],
      },
    },
  }];

  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Set priority" }],
    tools,
    tool_choice: { type: "function", function: { name: "set_priority" } },
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);

  assert(
    ["low", "medium", "high", "critical"].includes(args.priority),
    `priority should be one of the enum values, got: ${args.priority}`,
  );
});

Deno.test("Tool calling - parallel_tool_calls=false returns single call", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Do things" }],
    tools: sampleTools,
    tool_choice: "required" as const,
    parallel_tool_calls: false,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  assertEquals(
    data.choices[0].message.tool_calls.length,
    1,
    "With parallel_tool_calls=false, should return exactly 1 tool call",
  );
});

Deno.test("Tool calling - usage field present in tool call response", async () => {
  const requestBody = {
    model: "test-model",
    messages: [{ role: "user", content: "Search" }],
    tools: sampleTools,
    tool_choice: "required" as const,
  };

  const response = await makeTestRequest("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  assertExists(data.usage);
  assert(typeof data.usage.prompt_tokens === "number");
  assert(typeof data.usage.completion_tokens === "number");
  assert(typeof data.usage.total_tokens === "number");
  assert(data.usage.total_tokens === data.usage.prompt_tokens + data.usage.completion_tokens);
});
