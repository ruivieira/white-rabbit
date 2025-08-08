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
