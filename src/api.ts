export interface BaseCompletionsRequest {
  model: string;
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
  model: string;
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
