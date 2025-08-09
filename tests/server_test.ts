// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleRequest } from "../src/server.ts";

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
  assert(firstWord !== "one", 
    `Generated text "${choice.text}" should not start with "one" from prompt "${promptText}"`);
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
  assert(tokens.length <= maxTokens, 
    `Generated ${tokens.length} tokens, expected <= ${maxTokens}. Text: "${choice.text}"`);
  
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
    
    assert(tokens.length <= maxTokens, 
      `maxTokens=${maxTokens}: Generated ${tokens.length} tokens, expected <= ${maxTokens}`);
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
  assert(tokens.length <= maxTokens, 
    `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);
  
  // With aggressive fallback, we should consistently get at least 95% of max_tokens
  assert(tokens.length >= maxTokens * 0.95, 
    `Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${Math.round(tokens.length/maxTokens*100)}%)`);
  
  // Should hit the length limit due to aggressive fallback
  assertEquals(choice.finish_reason, "length", 
    "Should hit length limit with aggressive fallback");
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
  
  assert(tokens.length <= maxTokens, 
    `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);
  
  // With aggressive fallback, should generate at least 95% of max_tokens
  assert(tokens.length >= maxTokens * 0.95, 
    `Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${Math.round(tokens.length/maxTokens*100)}%)`);
  
  // Should hit the length limit due to aggressive fallback
  assertEquals(choice.finish_reason, "length", 
    "Should hit length limit with aggressive fallback");
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
  
  assert(tokens.length <= maxTokens, 
    `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);
  
  // With aggressive fallback, should generate at least 95% of max_tokens
  assert(tokens.length >= maxTokens * 0.95, 
    `Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${Math.round(tokens.length/maxTokens*100)}%)`);
  
  // Should hit the length limit due to aggressive fallback
  assertEquals(choice.finish_reason, "length", 
    "Should hit length limit with aggressive fallback");
});
