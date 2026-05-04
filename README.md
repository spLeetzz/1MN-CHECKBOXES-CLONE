# 1 Million Checkboxes

A massively multiplayer, real-time grid of 1,000,000 checkboxes built with Node.js, Express, and Socket.IO.

## Features
- **Real-time Sync**: Instant state updates across all clients using Socket.IO batched events.
- **Massive Scale**: Renders 1,000,000 checkboxes effortlessly using a highly optimized virtual scroll.
- **Pluggable Storage**: Run seamlessly in `memory` mode for local dev, or `redis` mode for multi-node scale.
- **OIDC Authentication**: Built-in OAuth integration with the General Auth Service.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp env.example .env
   ```
   *Make sure to fill in your `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, and `OIDC_REDIRECT_URI`.*

3. Run the app:
   ```bash
   npm start
   ```
   Visit `http://localhost:4000`.

## Architecture
- **Frontend**: Vanilla JS, HTML, and CSS with a custom virtual dom to keep memory usage tiny.
- **Backend**: Express for static serving and auth routing.
- **Socket**: Validates JWTs issued by the Auth SDK and handles high-frequency checkbox toggles.

## Registering the Client
If you need to register this app with your Auth Service, fill in your `.env` and run:
```bash
AUTH_TOKEN=your-dashboard-token node scripts/register-client.mjs
```
