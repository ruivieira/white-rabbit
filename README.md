# white-rabbit

[![Tests](https://github.com/ruivieira/white-rabbit/actions/workflows/ci.yml/badge.svg)](https://github.com/ruivieira/white-rabbit/actions/workflows/ci.yml)

<div align="center">
  <img src="docs/white-rabbit.jpg" alt="White Rabbit" width="300" />
</div>

Deno vLLM emulator providing mock OpenAI-compatible API endpoints for testing and development.

## Installation

### From JSR

```typescript
import { genParagraph } from "jsr:@rui/white-rabbit";
import type { ChatCompletionsRequest, EmbeddingRequest } from "jsr:@rui/white-rabbit/api";

// Generate mock text
const mockText = genParagraph(5);
```

### Using specific modules

```typescript
// Import API types
import type {
  ChatCompletionsRequest,
  CompletionsRequest,
  EmbeddingRequest,
} from "jsr:@rui/white-rabbit/api";

// Import text generation utilities
import { genParagraph } from "jsr:@rui/white-rabbit/text-generation";
```

## Run locally

```bash
cd /home/rui/Sync/code/typescript/white-rabbit
# Deno 1.41+ recommended
deno task dev
# or
deno task start

# Run with custom model name
WR_MODEL="my-custom-model" deno task start
```

## Configuration

### Environment Variables

- `WR_MODEL` - Override the model name returned in API responses. If not set, defaults to
  `Qwen/Qwen2.5-1.5B-Instruct`.

Example:

```bash
# Set model name to "granite-3.1-8b"
export WR_MODEL="granite-3.1-8b"
deno task start

# Or inline
WR_MODEL="granite-3.1-8b" deno task start
```

## Supported Endpoints

White Rabbit provides mock implementations of the following OpenAI-compatible endpoints:

### Health Check

- `GET /health` - Returns server status

### Chat Completions

- `POST /v1/chat/completions` - Generate chat completions

### Completions (Legacy)

- `POST /v1/completions` - Generate text completions

### Embeddings

- `POST /v1/embeddings` - Generate text embeddings

### Models

- `GET /v1/models` - List available models

### Tokenization

- `POST /tokenize` - Tokenise text into token IDs
- `POST /detokenize` - Convert token IDs back to text

### Server Information

- `GET /version` - Return vLLM version information
- `GET /stats` - Return server statistics and metrics

## Usage Examples

### Chat Completions

```bash
curl --request POST \
  --url http://localhost:8000/v1/chat/completions \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "test-model",
  "messages": [
    {
      "role": "user",
      "content": "What is the opposite of down?"
    }
  ],
  "temperature": 0,
  "logprobs": true,
  "max_tokens": 500
}'
```

### Text Completions

```bash
curl --request POST \
  --url http://localhost:8000/v1/completions \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "test-model",
  "prompt": "Once upon a time",
  "max_tokens": 100,
  "n": 1
}'
```

### Embeddings

```bash
curl --request POST \
  --url http://localhost:8000/v1/embeddings \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "test-embedding-model",
  "input": "The quick brown fox jumps over the lazy dog",
  "encoding_format": "float"
}'
```

### Multiple Text Embeddings

```bash
curl --request POST \
  --url http://localhost:8000/v1/embeddings \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "test-embedding-model",
  "input": [
    "First text to embed",
    "Second text to embed",
    "Third text to embed"
  ],
  "encoding_format": "float",
  "dimensions": 768
}'
```

### Models

```bash
curl --request GET \
  --url http://localhost:8000/v1/models
```

### Tokenization

```bash
curl --request POST \
  --url http://localhost:8000/tokenize \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "test-model",
  "text": "Hello, world!",
  "add_special_tokens": true
}'
```

### Detokenization

```bash
curl --request POST \
  --url http://localhost:8000/detokenize \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "test-model",
  "tokens": [1, 15496, 11, 1917, 0, 2]
}'
```

### Version Information

```bash
# Basic version info
curl --request GET \
  --url http://localhost:8000/version

# Detailed version info with build details
curl --request GET \
  --url http://localhost:8000/version?details=true
```

### Server Statistics

```bash
curl --request GET \
  --url http://localhost:8000/stats
```

## Features

- **Mock Data Generation**: Generates realistic-looking mock responses with random text and
  embeddings
- **Markov completions**: Uses a small QA dataset and a weighted Markov chain to produce more
  topic-relevant answers for `/v1/completions` and `/v1/chat/completions`.
- **OpenAI API Compatibility**: Follows OpenAI API specifications for request/response formats
- **Multiple Input Support**: Supports single strings, arrays of strings, and token ID arrays
- **Configurable Parameters**: Supports parameters like `max_tokens`, `n`, `logprobs`, `dimensions`,
  etc.
- **Normalised Embeddings**: Generated embeddings are unit vectors (normalised to length 1)
- **Token Usage Tracking**: Returns realistic token usage statistics
- **Model Management**: Lists available models with metadata
- **Tokenization Support**: Mock tokenization and detokenization with consistent token IDs
- **Server Monitoring**: Provides version information and real-time server statistics

Any string is accepted for the `model` argument across all endpoints. However, the actual model name
returned in responses is determined by the `WR_MODEL` environment variable (or the default
`Qwen/Qwen2.5-1.5B-Instruct` if not set), regardless of what the client requests.

## Docker

### Build and Run

```bash
# Build the Docker image
docker build -t white-rabbit .

# Run the container
docker run -p 8000:8000 white-rabbit

# Run with custom port
docker run -p 9000:8000 white-rabbit

# Run with custom model name
docker run -p 8000:8000 -e WR_MODEL="granite-3.1-8b" white-rabbit
```

### Docker Features

- **Multi-stage build**: Uses UBI9 as builder base for security and compliance
- **Compiled binary**: Compiles Deno application to a single executable binary
- **Minimal runtime**: Final image uses UBI9 minimal for reduced attack surface
- **Non-root user**: Runs as dedicated `whiterabbit` user for security
- **Health check**: Built-in health check endpoint monitoring
- **Optimised layers**: Efficient Docker layer caching for faster rebuilds
