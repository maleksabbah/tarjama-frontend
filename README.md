# tarjama-frontend

Web client for the **Tarjama** Arabic ASR platform. A Next.js app (deployed on Vercel) for uploading media, tracking jobs, downloading subtitles, and live microphone transcription.

## Architecture

- **Pages / routes** — the screens (upload, jobs, live, auth), built with the Next.js app router.
- **API layer** — a single client module that wraps all backend calls (auth, jobs, files) so components never call `fetch` directly.
- **Auth** — token storage and refresh handled in one place and shared across the app.

For batch work it talks to the gateway over REST; for live transcription it opens a WebSocket to the orchestrator and streams microphone audio.

Part of a multi-service system — see the [platform overview](https://github.com/maleksabbah/tarjama-docker) for the full architecture, pipeline flow, and the other services.
