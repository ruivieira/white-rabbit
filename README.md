# white-rabbit

Deno vLLM emulator providing mock `/v1/completions` and `/v1/chat/completions` endpoints.

## Run locally

```bash
cd /home/rui/Sync/code/typescript/white-rabbit
# Deno 1.41+ recommended
deno task dev
# or
deno task start
```

Once running on port 8000, you can call it like:

```bash
curl --request POST \
  --url http://localhost:8000/v1/chat/completions \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "vllm-runtime-cpu-fp16",
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

Any string is accepted for the `model` argument.
