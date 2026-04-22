# Deployment Env

## Frontend (Vercel)

Set these variables in Vercel:

```env
VITE_PLATFORM_API_URL=https://your-django-api-domain.com
VITE_SOCKET_URL=https://your-realtime-backend.onrender.com
VITE_AI_GATEWAY_URL=https://your-realtime-backend.onrender.com
VITE_DATA_PROVIDER=api
VITE_AI_GATEWAY_ENABLED=true
VITE_VOICE_GATEWAY_URL=https://your-realtime-backend.onrender.com
VITE_VOICE_GATEWAY_ENABLED=true
VITE_VOICE_TTS_VOICE=female-natural
```

`VITE_PLATFORM_API_URL` is your Django backend from `ResaultBac`.

`VITE_SOCKET_URL` is the separate realtime backend for online games and invites.

`VITE_AI_GATEWAY_URL` can point to the same Node backend if that service also handles AI requests.

`VITE_VOICE_GATEWAY_URL` should point to backend with neural TTS endpoints (`/api/voice/tts` or `/api/ai/voice/tts`).

## Django Backend (`ResaultBac`)

Allow your frontend domain:

```env
ALLOWED_HOSTS=your-django-api-domain.com,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://your-project.vercel.app
CORS_ALLOWED_ORIGINS=https://your-project.vercel.app
```

## Realtime Backend (`ai-homework-service`)

Allow the same frontend domain:

```env
CORS_ALLOWED_ORIGINS=https://your-project.vercel.app
PROVIDER_ORDER=gemini
GEMINI_API_KEY=your_key_if_ai_is_enabled
```

If you want this backend to run sockets only, you can leave `PROVIDER_ORDER` empty and skip AI keys.

For neural voice also expose a TTS endpoint (example):

```txt
POST /api/voice/tts
Body: { text, lang, voice, format }
```
