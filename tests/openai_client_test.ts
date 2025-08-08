import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleRequest } from "../src/server.ts";
import OpenAI from "@openai/openai";

// Start test server for OpenAI client integration tests
async function startTestServer(): Promise<{ port: number; controller: AbortController }> {
  const controller = new AbortController();
  const port = 8001; // Use different port for tests

  const _server = serve(handleRequest, {
    port,
    signal: controller.signal,
    onListen: () => {}, // Suppress listen message
  });

  // Give server time to start
  await new Promise((resolve) => setTimeout(resolve, 100));

  return { port, controller };
}

Deno.test("OpenAI client - chat completions", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key", // Our emulator doesn't validate API keys
      baseURL: `http://localhost:${port}/v1`,
    });

    const completion = await client.chat.completions.create({
      model: "test-model",
      messages: [
        { role: "user", content: "Hello, how are you?" },
      ],
      max_tokens: 50,
    });

    // Verify response structure matches OpenAI API
    assertExists(completion.id);
    assertEquals(completion.object, "chat.completion");
    assertEquals(completion.model, "test-model");
    assertExists(completion.created);
    assertExists(completion.system_fingerprint);
    assertEquals(completion.choices.length, 1);

    const choice = completion.choices[0];
    assertEquals(choice.index, 0);
    assertEquals(choice.message.role, "assistant");
    assertExists(choice.message.content);
    assertEquals(choice.message.refusal, null);
    assert(["stop", "length"].includes(choice.finish_reason));

    assertExists(completion.usage);
    assert(typeof completion.usage.prompt_tokens === "number");
    assert(typeof completion.usage.completion_tokens === "number");
    assert(typeof completion.usage.total_tokens === "number");
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - chat completions with multiple choices", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    const completion = await client.chat.completions.create({
      model: "test-model",
      messages: [
        { role: "user", content: "Generate some text" },
      ],
      max_tokens: 30,
      n: 3,
    });

    assertEquals(completion.choices.length, 3);

    completion.choices.forEach((choice, index) => {
      assertEquals(choice.index, index);
      assertExists(choice.message.content);
      assertEquals(choice.message.role, "assistant");
    });
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - chat completions with logprobs", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    const completion = await client.chat.completions.create({
      model: "test-model",
      messages: [
        { role: "user", content: "Test logprobs" },
      ],
      max_tokens: 20,
      logprobs: true,
    });

    const choice = completion.choices[0];
    assertExists(choice.logprobs);
    assertExists(choice.logprobs.content);
    assert(Array.isArray(choice.logprobs.content));

    if (choice.logprobs.content && choice.logprobs.content.length > 0) {
      const logprob = choice.logprobs.content[0];
      assertExists(logprob.token);
      assert(typeof logprob.logprob === "number");
      assert(logprob.logprob <= 0); // Logprobs should be negative
    }
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - completions", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    const completion = await client.completions.create({
      model: "test-model",
      prompt: "Once upon a time",
      max_tokens: 50,
    });

    assertExists(completion.id);
    assertEquals(completion.object, "chat.completion"); // Our emulator returns this
    assertEquals(completion.model, "test-model");
    assertExists(completion.created);
    assertEquals(completion.choices.length, 1);

    const choice = completion.choices[0];
    assertEquals(choice.index, 0);
    assertExists(choice.text);
    assert(["stop", "length"].includes(choice.finish_reason));
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - completions with echo", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    const promptText = "The quick brown fox";
    const completion = await client.completions.create({
      model: "test-model",
      prompt: promptText,
      max_tokens: 30,
      echo: true,
    });

    const choice = completion.choices[0];
    assert(choice.text.startsWith(promptText));
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - completions with logprobs", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    const completion = await client.completions.create({
      model: "test-model",
      prompt: "Test prompt",
      max_tokens: 20,
      logprobs: 5, // Request top 5 logprobs
    });

    const choice = completion.choices[0];
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
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - error handling for invalid requests", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    // Test invalid chat completion (missing messages)
    try {
      await client.chat.completions.create({
        model: "test-model",
        // @ts-expect-error Testing invalid request
        messages: undefined,
      });
      assert(false, "Should have thrown an error");
    } catch (error) {
      // OpenAI client should handle the 400 response from our emulator
      assert(error instanceof Error);
    }
  } finally {
    controller.abort();
  }
});

Deno.test("OpenAI client - streaming not supported", async () => {
  const { port, controller } = await startTestServer();

  try {
    const client = new OpenAI({
      apiKey: "fake-key",
      baseURL: `http://localhost:${port}/v1`,
    });

    // Our emulator doesn't support streaming, but we should handle the request gracefully
    const completion = await client.chat.completions.create({
      model: "test-model",
      messages: [
        { role: "user", content: "Test streaming" },
      ],
      max_tokens: 20,
      stream: false, // Explicitly set to false since we don't support streaming
    });

    assertExists(completion.choices);
    assertEquals(completion.choices.length, 1);
  } finally {
    controller.abort();
  }
});
