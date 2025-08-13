export interface BaseCompletionsRequest {
  model?: string | null;
  max_tokens?: number | null;
  n?: number;
  logprobs?: boolean;
  echo?: boolean;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatCompletionsRequest extends BaseCompletionsRequest {
  messages: ChatMessage[];
}

export interface CompletionsRequest extends BaseCompletionsRequest {
  prompt: string | string[];
}

export interface EmbeddingRequest {
  model?: string | null;
  input: string | string[] | number[] | number[][];
  encoding_format?: "float" | "base64";
  dimensions?: number;
  user?: string;
}

export interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  id: string;
  object: "list";
  created: number;
  model: string;
  data: EmbeddingData[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// New endpoint types
export interface TokenizeRequest {
  model?: string | null;
  text: string;
  add_special_tokens?: boolean;
}

export interface TokenizeResponse {
  tokens: number[];
  count: number;
  max_model_len: number;
}

export interface DetokenizeRequest {
  model?: string | null;
  tokens: number[];
}

export interface DetokenizeResponse {
  text: string;
}

export interface ModelInfo {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  permission: unknown[];
  root: string;
  parent: null;
  max_model_len?: number;
}

export interface ModelsResponse {
  object: "list";
  data: ModelInfo[];
}

export interface VersionResponse {
  version: string;
  white_rabbit_version: string;
  build_info?: {
    name: string;
    description: string;
    version: string;
    vllm_version: string;
    deno_version: string;
    typescript_version: string;
    v8_version: string;
    built_at: string;
  };
}

export interface StatsResponse {
  num_requests: number;
  num_requests_running: number;
  num_requests_swapped: number;
  num_requests_waiting: number;
  gpu_cache_usage: number;
  cpu_cache_usage: number;
  num_preemptions: number;
}
