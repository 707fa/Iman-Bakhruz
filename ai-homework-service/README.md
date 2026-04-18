# AI Homework Gateway

Express gateway for AI requests with:
- provider fallback (`gemini -> deepseek -> openrouter`)
- queue/concurrency limit
- request timeout + retry (safe cases)
- Redis cache and rate limit (with local fallback)
- strict CORS allowlist

## Endpoints

- `GET /health`
- `GET /api/health`
- `POST /api/ai/chat`
- `POST /api/ai/homework-check`
- `POST /api/ai/check` (legacy alias)
- `POST /api/ai/speaking/check`

`POST` accepts `multipart/form-data`:
- `text` (optional)
- `image` (optional, jpeg/png/webp)
- at least one of `text` or `image` is required

`POST /api/ai/speaking/check` accepts `application/json`:
- `question` (required)
- `transcript` (required)
- `level` (optional)
- `language` (optional)

Success response:

```json
{
  "success": true,
  "provider": "gemini",
  "cached": false,
  "result": "..."
}
```

## Local запуск

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill provider keys.

3. Start:

```bash
npm run dev
```

or production mode:

```bash
npm start
```

## Required env

- `PORT`
- `CORS_ALLOWED_ORIGINS`
- `PROVIDER_ORDER`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY` (if provider included in order)
- `OPENROUTER_API_KEY` (if provider included in order)
- `AI_REQUEST_TIMEOUT_MS`
- `NODE_ENV`

## Render quick setup

- Root directory: `ai-homework-service`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Add env variables from `.env.example`

## Railway quick setup

- Root directory: `ai-homework-service`
- Start command: `npm start`
- Add env variables from `.env.example`
