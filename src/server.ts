import { genParagraph } from "./text_generation.ts";
import { ChatCompletionsRequest, CompletionsRequest, EmbeddingRequest } from "./api.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Get model name from environment variable, with fallback to default
function getModelName(_requestModel: string): string {
  return Deno.env.get("WR_MODEL") || "Qwen/Qwen2.5-1.5B-Instruct";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function uuidHex(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

function systemFingerprint(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function countWords(text: string): number {
  return text.trim().length ? text.trim().split(/\s+/).length : 0;
}

// Embedded logo for compatibility with compiled binaries
const LOGO = `             ,\\
             \\\\\\,_
              \\\` ,\\
         __,.-" =__)
       ."        )
    ,_/   ,    \\/\\_
    \\_|    )_-\\ \\_-\`
jgs    \`-----\` \`--\``;

function showStartupBanner(port: number): void {
  const modelName = Deno.env.get("WR_MODEL") || "Qwen/Qwen2.5-1.5B-Instruct";
  
  console.log(`
${LOGO}

🐰 White Rabbit vLLM Emulator
🚀 Server running on port ${port}
🤖 Model: ${modelName}
🔗 Health check: http://localhost:${port}/health
📡 Endpoints:
   • POST /v1/chat/completions
   • POST /v1/completions  
   • POST /v1/embeddings
💡 Ready to serve mock OpenAI-compatible responses!
`);
}

function generateMockEmbedding(dimensions = 384): number[] {
  // Generate a normalised random vector
  const embedding = Array.from({ length: dimensions }, () => Math.random() - 0.5);

  // Normalise to unit length (common for embeddings)
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

async function parseJson<T>(req: Request): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/health") {
    return json({ status: "ok" });
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    const body = await parseJson<ChatCompletionsRequest>(req);
    if (!body || !body.model || !Array.isArray(body.messages)) {
      return json({ error: "Invalid request body" }, 400);
    }

    const n = body.n ?? 1;
    const maxTokens = body.max_tokens ?? null;
    const wantLogprobs = Boolean(body.logprobs);

    const promptTokens = body.messages.reduce((acc, m) => acc + countWords(m.content ?? ""), 0);

    const choices: unknown[] = [];
    let generatedTokens = 0;

    for (let i = 0; i < n; i++) {
      const { text, hitMaxLength } = genParagraph(maxTokens);

      let logprobs: {
        content: Array<
          { token: string; logprob: number; bytes: unknown[]; top_logprobs: unknown[] }
        >;
      } | null = null;
      if (wantLogprobs) {
        logprobs = { content: [] };
        for (const word of text.split(/\s+/)) {
          const lp = -Math.random();
          logprobs.content.push({ token: word, logprob: lp, bytes: [], top_logprobs: [] });
        }
      }

      generatedTokens += text.trim().length ? text.trim().split(/\s+/).length : 0;
      choices.push({
        index: i,
        message: { role: "assistant", content: text, refusal: null },
        logprobs,
        finish_reason: hitMaxLength ? "length" : "stop",
      });
    }

    const resp = {
      id: "chat_completion_" + uuidHex(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: getModelName(body.model),
      system_fingerprint: systemFingerprint(),
      choices,
      usage: {
        prompt_tokens: promptTokens,
        total_tokens: promptTokens + generatedTokens,
        completion_tokens: generatedTokens,
        prompt_tokens_details: null,
      },
      prompt_logprobs: null,
    };
    return json(resp);
  }

  if (req.method === "POST" && url.pathname === "/v1/completions") {
    const body = await parseJson<CompletionsRequest>(req);
    if (!body || !body.model || typeof body.prompt === "undefined") {
      return json({ error: "Invalid request body" }, 400);
    }

    const n = body.n ?? 1;
    const maxTokens = body.max_tokens ?? null;
    const wantLogprobs = Boolean(body.logprobs);

    const promptStr = Array.isArray(body.prompt)
      ? (body.prompt[0] ?? "")
      : String(body.prompt ?? "");

    const choices: unknown[] = [];

    for (let i = 0; i < n; i++) {
      let { text, hitMaxLength } = genParagraph(maxTokens);
      if (body.echo) text = promptStr + text;

      let logprobs: {
        text_offset: number[];
        token_logprobs: number[];
        tokens: string[];
        top_logprobs: Record<string, number>[];
      } | null = null;
      if (wantLogprobs) {
        const tokens = text.split(/(\s+)/);
        const text_offset: number[] = [];
        const token_logprobs: number[] = [];
        const top_logprobs: Record<string, number>[] = [];
        let offset = 0;
        for (const tok of tokens) {
          text_offset.push(offset);
          offset += tok.length;
          const lp = -Math.random();
          token_logprobs.push(lp);
          top_logprobs.push({ [tok]: lp });
        }
        logprobs = { text_offset, token_logprobs, tokens, top_logprobs };
      }

      choices.push({
        index: i,
        text,
        logprobs,
        finish_reason: hitMaxLength ? "length" : "stop",
      });
    }

    const resp = {
      id: "chat_completion_" + uuidHex(),
      object: "chat.completion",
      created: Date.now() / 1000,
      model: getModelName(body.model),
      system_fingerprint: systemFingerprint(),
      choices,
      usage: {},
    };
    return json(resp);
  }

  if (req.method === "POST" && url.pathname === "/v1/embeddings") {
    const body = await parseJson<EmbeddingRequest>(req);
    if (!body || !body.model || !body.input) {
      return json({ error: "Invalid request body" }, 400);
    }

    // Convert input to array of strings
    let inputs: string[] = [];
    if (typeof body.input === "string") {
      inputs = [body.input];
    } else if (Array.isArray(body.input)) {
      if (body.input.length === 0) {
        return json({ error: "Input cannot be empty" }, 400);
      }

      // Handle both string arrays and token ID arrays
      if (typeof body.input[0] === "string") {
        inputs = body.input as string[];
      } else if (typeof body.input[0] === "number") {
        // For token arrays, create a mock string representation
        inputs = ["<token_sequence>"];
      } else if (Array.isArray(body.input[0])) {
        // For nested token arrays, create mock strings for each sequence
        inputs = (body.input as number[][]).map(() => "<token_sequence>");
      }
    }

    const dimensions = body.dimensions ?? 384;
    const data = inputs.map((_input, index) => ({
      object: "embedding" as const,
      embedding: generateMockEmbedding(dimensions),
      index,
    }));

    const totalTokens = inputs.reduce((acc, input) => acc + countWords(input), 0);

    const resp = {
      id: "embd-" + uuidHex(),
      object: "list",
      created: Math.floor(Date.now() / 1000),
      model: getModelName(body.model),
      data,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens,
      },
    };

    return json(resp);
  }

  return json({ error: "Not found" }, 404);
}

// Only start server if this is the main module
if (import.meta.main) {
  const port = 8000;
  showStartupBanner(port);
  serve(handleRequest, { port });
}
