import { genParagraph } from "./text_generation.ts";
import { generateCorpusMarkovAnswer } from "./markov.ts";
import { getVersionInfo } from "./version.ts";
import { initLogger, LogLevel } from "./logger.ts";
import {
  ChatCompletionsRequest,
  CompletionsRequest,
  DetokenizeRequest,
  EmbeddingRequest,
  ModelInfo,
  ModelsResponse,
  StatsResponse,
  TokenizeRequest,
} from "./api.ts";

// Function to get the current logger for this module
function getLogger() {
  return initLogger("server");
}

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

// Server statistics tracking
const serverStats = {
  startTime: Date.now(),
  totalRequests: 0,
  runningRequests: 0,
  promptTokens: 0,
  generationTokens: 0,
  lastLogTime: Date.now(),
};

// Periodic stats logging (similar to vLLM)
function logPeriodicStats(): void {
  const now = Date.now();
  const deltaTime = (now - serverStats.lastLogTime) / 1000; // Convert to seconds

  if (deltaTime <= 0) return;

  const promptThroughput = serverStats.promptTokens / deltaTime;
  const generationThroughput = serverStats.generationTokens / deltaTime;
  const uptime = Math.floor((now - serverStats.startTime) / 1000);

  // Log stats similar to vLLM format
  getLogger().info(
    `Engine 000: Avg prompt throughput: ${promptThroughput.toFixed(1)} tokens/s, ` +
      `Avg generation throughput: ${generationThroughput.toFixed(1)} tokens/s, ` +
      `Running: ${serverStats.runningRequests} reqs, ` +
      `Total: ${serverStats.totalRequests} reqs, ` +
      `Uptime: ${uptime}s`,
    "server.ts",
    65,
  );

  // Reset counters for next interval
  serverStats.promptTokens = 0;
  serverStats.generationTokens = 0;
  serverStats.lastLogTime = now;
}

// Start periodic stats logging every 10 seconds (similar to vLLM)
let statsInterval: number;
function startPeriodicStatsLogging(): void {
  statsInterval = setInterval(logPeriodicStats, 10000); // 10 seconds
}

function stopPeriodicStatsLogging(): void {
  if (statsInterval) {
    clearInterval(statsInterval);
  }
}

// Mock tokenizer functions
function mockTokenize(text: string, addSpecialTokens = true): number[] {
  // Simple mock tokenization: each word/punctuation becomes a token ID
  const words = text.split(/(\s+|[.,!?;:])/g).filter((w) => w.trim());
  const tokens = words.map((word, _index) => {
    // Generate consistent token IDs based on word hash
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 50000 + 1000; // Token IDs between 1000-51000
  });

  if (addSpecialTokens) {
    return [1, ...tokens, 2]; // Add BOS (1) and EOS (2) tokens
  }
  return tokens;
}

function mockDetokenize(tokens: number[]): string {
  // Simple mock detokenization: convert token IDs back to placeholder text
  return tokens.map((tokenId) => {
    if (tokenId === 1) return "<bos>";
    if (tokenId === 2) return "<eos>";
    if (tokenId < 1000) return `<special_${tokenId}>`;

    // Generate consistent words from token IDs
    const words = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "within",
      "without",
      "under",
      "over",
      "inside",
      "outside",
      "near",
      "far",
      "here",
      "there",
      "where",
      "when",
      "why",
      "how",
      "what",
      "who",
      "which",
      "this",
      "that",
      "these",
      "those",
      "some",
      "many",
      "few",
      "all",
      "none",
      "each",
      "every",
      "any",
      "other",
      "another",
      "same",
      "different",
      "new",
      "old",
      "young",
      "big",
      "small",
      "large",
      "little",
      "high",
      "low",
      "long",
      "short",
      "wide",
      "narrow",
      "thick",
      "thin",
      "heavy",
      "light",
      "dark",
      "bright",
      "clean",
      "dirty",
      "hot",
      "cold",
      "warm",
      "cool",
      "dry",
      "wet",
      "hard",
      "soft",
      "smooth",
      "rough",
      "strong",
      "weak",
      "fast",
      "slow",
      "quick",
      "easy",
      "difficult",
      "simple",
      "complex",
      "good",
      "bad",
      "right",
      "wrong",
      "true",
      "false",
      "real",
      "fake",
      "important",
      "necessary",
      "possible",
      "impossible",
      "sure",
      "certain",
      "clear",
      "obvious",
      "hidden",
      "secret",
      "open",
      "closed",
      "free",
      "busy",
      "ready",
      "finished",
      "complete",
      "empty",
      "full",
      "rich",
      "poor",
      "happy",
      "sad",
      "angry",
      "calm",
      "excited",
      "bored",
      "tired",
      "fresh",
      "alive",
      "dead",
      "healthy",
      "sick",
      "safe",
      "dangerous",
      "careful",
      "careless",
      "patient",
      "impatient",
      "kind",
      "mean",
      "friendly",
      "unfriendly",
      "polite",
      "rude",
      "honest",
      "dishonest",
      "brave",
      "afraid",
      "confident",
      "nervous",
      "proud",
      "ashamed",
      "surprised",
      "expected",
      "interested",
      "bored",
      "worried",
      "relaxed",
      "stressed",
      "comfortable",
      "uncomfortable",
    ];
    const wordIndex = (tokenId - 1000) % words.length;
    return words[wordIndex];
  }).join(" ");
}

function getAvailableModels(): ModelInfo[] {
  const modelName = getModelName("");
  const created = Math.floor(serverStats.startTime / 1000);

  return [{
    id: modelName,
    object: "model",
    created,
    owned_by: "white-rabbit",
    permission: [],
    root: modelName,
    parent: null,
    max_model_len: 32768,
  }];
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

function showStartupBanner(port: number, host: string): void {
  const modelName = Deno.env.get("WR_MODEL") || "Qwen/Qwen2.5-1.5B-Instruct";

  console.log(`
${LOGO}

🐰 White Rabbit vLLM Emulator
🚀 Server running on ${host}:${port}
🤖 Model: ${modelName}
🔗 Health check: http://${host}:${port}/health
📡 Endpoints:
   • POST /v1/chat/completions
   • POST /v1/completions
   • POST /v1/embeddings
   • GET /v1/models
   • POST /tokenize
   • POST /detokenize
   • GET /version
   • GET /stats
💡 Ready to serve mock OpenAI-compatible responses!
`);

  getLogger().info("White Rabbit vLLM Emulator starting up", "server.ts", 346);
  getLogger().info(`Server running on ${host}:${port}`, "server.ts", 347);
  getLogger().info(`Model: ${modelName}`, "server.ts", 348);
  getLogger().info("Available routes:", "server.ts", 349);
  getLogger().info("Route: /health, Methods: GET", "server.ts", 350);
  getLogger().info("Route: /v1/chat/completions, Methods: POST", "server.ts", 351);
  getLogger().info("Route: /v1/completions, Methods: POST", "server.ts", 352);
  getLogger().info("Route: /v1/embeddings, Methods: POST", "server.ts", 353);
  getLogger().info("Route: /v1/models, Methods: GET", "server.ts", 354);
  getLogger().info("Route: /tokenize, Methods: POST", "server.ts", 355);
  getLogger().info("Route: /detokenize, Methods: POST", "server.ts", 356);
  getLogger().info("Route: /version, Methods: GET", "server.ts", 357);
  getLogger().info("Route: /stats, Methods: GET", "server.ts", 358);
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

// Request logging middleware for debug level
async function logRequest(req: Request, url: URL): Promise<void> {
  if (getLogger().config.level > LogLevel.DEBUG) return;

  const method = req.method;
  const pathname = url.pathname;
  const headers = Object.fromEntries(req.headers.entries());

  getLogger().debug(`=== HTTP Request Log ===`, "server.ts", 386);
  getLogger().debug(`Method: ${method}`, "server.ts", 387);
  getLogger().debug(`Path: ${pathname}`, "server.ts", 388);
  getLogger().debug(`Headers: ${JSON.stringify(headers, null, 2)}`, "server.ts", 389);

  // Log request body for POST requests
  if (method === "POST") {
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.text();
      if (body) {
        getLogger().debug(`Body: ${body}`, "server.ts", 397);
      }
    } catch (error) {
      getLogger().debug(`Failed to read request body: ${error}`, "server.ts", 400);
    }
  }

  getLogger().debug(`=== End Request Log ===`, "server.ts", 404);
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Log request details if debug level is enabled
  await logRequest(req, url);

  // Track request statistics
  serverStats.totalRequests++;
  serverStats.runningRequests++;

  getLogger().debug(`Incoming ${req.method} request to ${url.pathname}`, "server.ts", 417);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      getLogger().debug("Health check request", "server.ts", 421);
      return json({ status: "ok" });
    }

    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      getLogger().info("Processing chat completion request", "server.ts", 426);
      const body = await parseJson<ChatCompletionsRequest>(req);
      if (!body || !body.model || !Array.isArray(body.messages)) {
        getLogger().warning(
          `Invalid chat completion request body: ${JSON.stringify(body)}`,
          "server.ts",
          429,
        );
        return json({ error: "Invalid request body" }, 400);
      }

      const n = body.n ?? 1;
      const maxTokens = body.max_tokens ?? null;
      const wantLogprobs = Boolean(body.logprobs);

      const promptTokens = body.messages.reduce((acc, m) => acc + countWords(m.content ?? ""), 0);
      serverStats.promptTokens += promptTokens;

      const choices: unknown[] = [];
      let generatedTokens = 0;

      for (let i = 0; i < n; i++) {
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        const seed = lastUser?.content ?? "";
        let { text, hitMaxLength } = await generateCorpusMarkovAnswer(seed, maxTokens);
        if (!text) ({ text, hitMaxLength } = genParagraph(maxTokens));

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

        const tokensInResponse = text.trim().length ? text.trim().split(/\s+/).length : 0;
        generatedTokens += tokensInResponse;
        serverStats.generationTokens += tokensInResponse;
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
      getLogger().info(`Chat completion generated: ${generatedTokens} tokens`, "server.ts", 488);
      return json(resp);
    }

    if (req.method === "POST" && url.pathname === "/v1/completions") {
      getLogger().info("Processing completion request", "server.ts", 493);
      const body = await parseJson<CompletionsRequest>(req);
      if (!body || !body.model || typeof body.prompt === "undefined") {
        getLogger().warning(
          `Invalid completion request body: ${JSON.stringify(body)}`,
          "server.ts",
          496,
        );
        return json({ error: "Invalid request body" }, 400);
      }

      const n = body.n ?? 1;
      const maxTokens = body.max_tokens ?? null;
      const wantLogprobs = Boolean(body.logprobs);

      const promptStr = Array.isArray(body.prompt)
        ? (body.prompt[0] ?? "")
        : String(body.prompt ?? "");

      const promptTokens = countWords(promptStr);
      serverStats.promptTokens += promptTokens;

      const choices: unknown[] = [];

      for (let i = 0; i < n; i++) {
        let { text, hitMaxLength } = await generateCorpusMarkovAnswer(promptStr, maxTokens);
        if (!text) ({ text, hitMaxLength } = genParagraph(maxTokens));
        if (body.echo) text = promptStr + text;

        const tokensInResponse = text.trim().length ? text.trim().split(/\s+/).length : 0;
        serverStats.generationTokens += tokensInResponse;

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
      getLogger().info("Processing embedding request", "server.ts", 564);
      const body = await parseJson<EmbeddingRequest>(req);
      if (!body || !body.model || !body.input) {
        getLogger().warning(
          `Invalid embedding request body: ${JSON.stringify(body)}`,
          "server.ts",
          567,
        );
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

    // GET /v1/models - List available models
    if (req.method === "GET" && url.pathname === "/v1/models") {
      getLogger().debug("Listing available models", "server.ts", 618);
      const response: ModelsResponse = {
        object: "list",
        data: getAvailableModels(),
      };
      return json(response);
    }

    // POST /tokenize - Tokenize text
    if (req.method === "POST" && url.pathname === "/tokenize") {
      getLogger().debug("Processing tokenize request", "server.ts", 628);
      const body = await parseJson<TokenizeRequest>(req);
      if (!body || !body.model || typeof body.text !== "string") {
        getLogger().warning(
          `Invalid tokenize request body: ${JSON.stringify(body)}`,
          "server.ts",
          631,
        );
        return json({ error: "Invalid request body. Required fields: model, text" }, 400);
      }

      const tokens = mockTokenize(body.text, body.add_special_tokens ?? true);
      const response = {
        tokens,
        count: tokens.length,
        max_model_len: 32768,
      };
      return json(response);
    }

    // POST /detokenize - Convert tokens back to text
    if (req.method === "POST" && url.pathname === "/detokenize") {
      getLogger().debug("Processing detokenize request", "server.ts", 646);
      const body = await parseJson<DetokenizeRequest>(req);
      if (!body || !body.model || !Array.isArray(body.tokens)) {
        getLogger().warning(
          `Invalid detokenize request body: ${JSON.stringify(body)}`,
          "server.ts",
          649,
        );
        return json({ error: "Invalid request body. Required fields: model, tokens" }, 400);
      }

      const text = mockDetokenize(body.tokens);
      const response = {
        text,
      };
      return json(response);
    }

    // GET /version - Return vLLM version info
    if (req.method === "GET" && url.pathname === "/version") {
      getLogger().debug("Processing version request", "server.ts", 662);
      const includeDetails = url.searchParams.get("details") === "true";
      const versionInfo = getVersionInfo(includeDetails);
      return json(versionInfo);
    }

    // GET /stats - Return server statistics
    if (req.method === "GET" && url.pathname === "/stats") {
      getLogger().debug("Processing stats request", "server.ts", 670);
      const _uptime = Date.now() - serverStats.startTime;
      const response: StatsResponse = {
        num_requests: serverStats.totalRequests,
        num_requests_running: serverStats.runningRequests,
        num_requests_swapped: 0,
        num_requests_waiting: Math.max(0, Math.floor(Math.random() * 3)), // Mock waiting requests
        gpu_cache_usage: Math.random() * 0.8, // Mock GPU cache usage (0-80%)
        cpu_cache_usage: Math.random() * 0.6, // Mock CPU cache usage (0-60%)
        num_preemptions: Math.floor(Math.random() * 10), // Mock preemptions
      };
      return json(response);
    }

    getLogger().warning(`Route not found: ${req.method} ${url.pathname}`, "server.ts", 684);
    return json({ error: "Not found" }, 404);
  } catch (error) {
    getLogger().error(`Request processing error: ${error}`, "server.ts", 687);
    return json({ error: "Internal server error" }, 500);
  } finally {
    // Decrement running requests counter
    serverStats.runningRequests = Math.max(0, serverStats.runningRequests - 1);
  }
}

// Only start server if this is the main module
if (import.meta.main) {
  const port = parseInt(Deno.env.get("WR_PORT") || "8000", 10);
  const host = Deno.env.get("WR_HOST") || "0.0.0.0";

  showStartupBanner(port, host);
  getLogger().info("Starting HTTP server", "server.ts", 701);
  startPeriodicStatsLogging();

  // Start serving requests with proper host binding
  Deno.serve({ port, hostname: host }, handleRequest);
  getLogger().info("HTTP server started successfully", "server.ts", 706);

  // Graceful shutdown
  Deno.addSignalListener("SIGINT", () => {
    getLogger().info("Received SIGINT, shutting down gracefully", "server.ts", 710);
    stopPeriodicStatsLogging();
    Deno.exit(0);
  });

  Deno.addSignalListener("SIGTERM", () => {
    getLogger().info("Received SIGTERM, shutting down gracefully", "server.ts", 711);
    stopPeriodicStatsLogging();
    Deno.exit(0);
  });
}
