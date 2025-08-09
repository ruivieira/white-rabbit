// Export all API types and interfaces
export type {
  BaseCompletionsRequest,
  ChatCompletionsRequest,
  ChatMessage,
  CompletionsRequest,
  EmbeddingData,
  EmbeddingRequest,
  EmbeddingResponse,
} from "./src/api.ts";

// Export text generation utilities
export { genParagraph } from "./src/text_generation.ts";
