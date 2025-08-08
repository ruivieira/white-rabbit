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
