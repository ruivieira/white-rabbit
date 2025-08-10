# white-rabbit

[![Tests](https://github.com/ruivieira/white-rabbit/actions/workflows/ci.yml/badge.svg)](https://github.com/ruivieira/white-rabbit/actions/workflows/ci.yml)
[![JSR](https://jsr.io/badges/@rui/white-rabbit)](https://jsr.io/@rui/white-rabbit)
[![JSR Score](https://jsr.io/badges/@rui/white-rabbit/score)](https://jsr.io/@rui/white-rabbit)
[![quay.io](https://quay.io/repository/ruimvieira/white-rabbit/status "Docker Repository on Quay")](https://quay.io/repository/ruimvieira/white-rabbit)
[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/ruivieira/white-rabbit/main.svg)](https://results.pre-commit.ci/latest/github/ruivieira/white-rabbit/main)

<div align="center">
  <img src="docs/white-rabbit.png" alt="White Rabbit" width="300" />
</div>

Deno vLLM emulator providing mock OpenAI-compatible API endpoints for testing and development.

## Purpose

White Rabbit is designed to **test integration with vLLM APIs** without requiring a real LLM
deployment. The responses are typically gibberish since no actual language model is served - this is
intentional for testing API compatibility, request/response formats, and integration workflows.

Perfect for:

- Testing vLLM API integration code
- Development environments where you need vLLM-compatible endpoints
- CI/CD pipelines that need mock LLM services
- Load testing API clients without GPU resources

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

**Model Configuration:**

- `WR_MODEL` - Override the model name returned in API responses. If not set, defaults to
  `Qwen/Qwen2.5-1.5B-Instruct`.

**Logging Configuration:**

- `WR_LOG_LEVEL` - Set logging level: `DEBUG`, `INFO`, `WARNING`, or `ERROR` (default: `DEBUG`)
- `WR_LOG_PREFIX` - Customise log message prefix (default: `WHITE_RABBIT`)
- `WR_LOG_COLORS` - Enable/disable coloured log output: `true` or `false` (default: `true`)

**Examples:**

```bash
# Set model name to "granite-3.1-8b"
export WR_MODEL="granite-3.1-8b"
deno task start

# Or inline
WR_MODEL="granite-3.1-8b" deno task start

# Configure logging
WR_LOG_LEVEL=INFO WR_LOG_PREFIX="MY_SERVER" deno task start

# Disable coloured logs (useful for log files)
WR_LOG_COLORS=false deno task start
```

## Direct File Dataset Configuration

You can configure White Rabbit to use a custom dataset by setting the following environment
variables:

- `WR_HF_DATASET`: A direct URL to a CSV or text file (e.g.,
  `https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv`)
- `WR_HF_COLUMN`: The column name within the dataset to use for text generation

**Important**: For Hugging Face datasets, use the `/resolve/` endpoint instead of `/blob/` to get
the raw file content:

- ❌ `https://huggingface.co/datasets/name/repo/blob/main/file.csv` (HTML page)
- ✅ `https://huggingface.co/datasets/name/repo/resolve/main/file.csv` (raw file)

### Examples

**Using direct file URL (Recommended):**

```bash
export WR_HF_DATASET="https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv"
export WR_HF_COLUMN="text"
deno task start
```

**Using Docker with direct file URL:**

```bash
docker run -p 8000:8000 \
  -e WR_HF_DATASET="https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv" \
  -e WR_HF_COLUMN="text" \
  white-rabbit:latest
```

### Example - Toxigen Dataset

The toxigen dataset contains the following columns:

- `text`: The input text prompt (use this for text generation)
- `generation`: Generated text response
- `generation_method`: Method used for generation
- `group`: Group classification
- `prompt_label`: Label for the prompt
- `roberta_prediction`: RoBERTa model prediction

For text generation, use `WR_HF_COLUMN="text"`.

## Supported Endpoints

### Text Generation

- `POST /generate` - Generate text using Markov chains
- `GET /health` - Health check endpoint

## Using Custom Hugging Face Datasets

White Rabbit supports loading custom datasets directly from Hugging Face using the `/resolve/`
endpoint. This allows you to train the Markov chain on any CSV dataset hosted on Hugging Face.

### How It Works

1. **Dataset Source**: The system fetches CSV files directly from Hugging Face using the `/resolve/`
   endpoint
2. **Column Selection**: You specify which column contains the text data for training
3. **Automatic Parsing**: The system automatically parses the CSV and extracts the specified column
4. **Markov Training**: The extracted text is used to train the Markov chain for text generation
5. **Lazy Loading**: The dataset is loaded only when first needed, then cached in memory for
   subsequent requests

**Performance Note**: The first text generation request may experience a delay while the dataset
downloads and processes. However, once loaded, the dataset is cached in memory, so all subsequent
inference requests will be fast with no additional delays.

### Example: Toxigen Dataset for Toxic Model Detection

The [Toxigen dataset](https://huggingface.co/datasets/toxigen/toxigen-data) is particularly useful
for testing and evaluating toxic content detection models. This dataset contains:

- **Purpose**: Designed to test how well language models can detect and avoid generating toxic
  content
- **Content**: Contains prompts that are designed to elicit toxic responses from language models
- **Use Case**: Perfect for testing whether your text generation system can avoid producing harmful
  content

#### Setting Up Toxigen Dataset

```bash
# Set the dataset URL (use /resolve/ for raw file access)
export WR_HF_DATASET="https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv"

# Specify the column containing the text prompts
export WR_HF_COLUMN="text"

# Start the server
deno task start
```

#### Dataset Structure

The toxigen dataset contains these columns:

- `text`: The input text prompt (use this for text generation)
- `generation`: Generated text response
- `generation_method`: Method used for generation
- `group`: Group classification
- `prompt_label`: Label for the prompt
- `roberta_prediction`: RoBERTa model prediction

#### Testing Toxic Content Detection

With the toxigen dataset loaded, you can:

1. **Generate Text**: Use the `/generate` endpoint to create text based on the dataset
2. **Evaluate Safety**: Check if the generated text maintains appropriate content standards
3. **Model Testing**: Test how well your system handles potentially problematic prompts
4. **Content Filtering**: Implement additional safety measures based on the generated content

#### Example API Call

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a story about",
    "max_tokens": 100
  }'
```

### Other Dataset Examples

You can use any CSV dataset hosted on Hugging Face. Here are some other popular options:

- **Creative Writing**:
  `https://huggingface.co/datasets/writing-prompts/resolve/main/writing-prompts.csv`
- **Conversation Data**:
  `https://huggingface.co/datasets/conversation-ai/resolve/main/conversation.csv`
- **Custom Datasets**: Upload your own CSV files to Hugging Face and use the `/resolve/` endpoint

### Best Practices

1. **Use `/resolve/` endpoint**: Always use `/resolve/` instead of `/blob/` for raw file access
2. **Column validation**: Ensure the specified column exists and contains appropriate text data
3. **Content review**: Review generated content, especially when using datasets with sensitive
   content
4. **Testing**: Test your system thoroughly before deploying with custom datasets

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

### Core Functionality

- **Mock Data Generation**: Generates realistic-looking mock responses with random text and
  embeddings
- **Markov completions**: Uses a small QA dataset and a weighted Markov chain to produce more
  topic-relevant answers for `/v1/completions` and `/v1/chat/completions`. Supports custom Hugging
  Face datasets with configurable column extraction and format handling.
- **OpenAI API Compatibility**: Follows OpenAI API specifications for request/response formats
- **Multiple Input Support**: Supports single strings, arrays of strings, and token ID arrays
- **Configurable Parameters**: Supports parameters like `max_tokens`, `n`, `logprobs`, `dimensions`,
  etc.
- **Normalised Embeddings**: Generated embeddings are unit vectors (normalised to length 1)
- **Token Usage Tracking**: Returns realistic token usage statistics
- **Model Management**: Lists available models with metadata
- **Tokenization Support**: Mock tokenization and detokenization with consistent token IDs
- **Server Monitoring**: Provides version information and real-time server statistics

### Logging and Monitoring

- **vLLM-Compatible Logging**: Professional logging system that matches vLLM's output format
- **Periodic Statistics**: Automatic throughput reporting every 10 seconds (like vLLM)
  - Prompt tokens per second
  - Generation tokens per second
  - Running and total request counts
  - Server uptime tracking
- **Request Tracing**: Debug-level logging of all incoming requests and processing steps
- **Configurable Log Levels**: DEBUG, INFO, WARNING, ERROR with environment variable control
- **Coloured Output**: Colour-coded log messages for easy reading (configurable)
- **Graceful Shutdown**: Proper signal handling and resource cleanup

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

# Run with direct file dataset
docker run -p 8000:8000 \
  -e WR_HF_DATASET="https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv" \
  -e WR_HF_COLUMN="prompt" \
  white-rabbit
```

### Docker Features

- **Multi-stage build**: Uses UBI9 as builder base for security and compliance
- **Compiled binary**: Compiles Deno application to a single executable binary
- **Minimal runtime**: Final image uses UBI9 minimal for reduced attack surface
- **Non-root user**: Runs as dedicated `whiterabbit` user for security
- **Health check**: Built-in health check endpoint monitoring
- **Optimised layers**: Efficient Docker layer caching for faster rebuilds
