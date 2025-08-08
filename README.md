# white-rabbit

Deno vLLM emulator providing mock OpenAI-compatible API endpoints for testing and development.

## Run locally

```bash
cd /home/rui/Sync/code/typescript/white-rabbit
# Deno 1.41+ recommended
deno task dev
# or
deno task start
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

## Features

- **Mock Data Generation**: Generates realistic-looking mock responses with random text and
  embeddings
- **OpenAI API Compatibility**: Follows OpenAI API specifications for request/response formats
- **Multiple Input Support**: Supports single strings, arrays of strings, and token ID arrays
- **Configurable Parameters**: Supports parameters like `max_tokens`, `n`, `logprobs`, `dimensions`,
  etc.
- **Normalised Embeddings**: Generated embeddings are unit vectors (normalised to length 1)
- **Token Usage Tracking**: Returns realistic token usage statistics

Any string is accepted for the `model` argument across all endpoints.
