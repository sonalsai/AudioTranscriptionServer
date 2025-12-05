# Audio Transcription Server

This project provides a real-time audio transcription service using Deepgram with comprehensive structured logging.

## Features

- 🎙️ Real-time audio transcription via WebSocket
- 📊 Structured logging with Pino
- 🔍 Request/response tracking
- 🔌 WebSocket connection monitoring
- 🌊 Deepgram stream lifecycle logging
- ⚡ High-performance async logging

## Setup

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Create a `.env` file:**

    Create a `.env` file in the root of the project and add your Deepgram API key:

    ```env
    DEEPGRAM_API_KEY=YOUR_DEEPGRAM_API_KEY
    LOG_LEVEL=info  # Optional: fatal, error, warn, info, debug, trace
    ```

3.  **Start the server:**

    ```bash
    npm start
    ```

## Usage

- The server will be running at `http://localhost:3000`.
- The WebSocket server will be running at `ws://localhost:3000`.

## Development

To run the server in development mode (with auto-reloading):

```bash
npm run dev
```

## Logging

This server uses **Pino** for structured, high-performance logging. All logs include:

- Timestamps (ISO format)
- Log levels (fatal, error, warn, info, debug, trace)
- Contextual information (connection IDs, event types, etc.)
- Pretty-printed output in development

### Quick Examples

**View all logs:**

```bash
npm run dev
```

**Filter by log level:**

```bash
npm run dev | grep "ERROR"
```

**Track a specific connection:**

```bash
npm run dev | grep "connectionId\":1"
```

For detailed logging documentation, see **[LOGGING.md](./LOGGING.md)**.

## Environment Variables

| Variable           | Description                      | Default     |
| ------------------ | -------------------------------- | ----------- |
| `DEEPGRAM_API_KEY` | Your Deepgram API key (required) | -           |
| `PORT`             | Server port                      | `3000`      |
| `DOMAIN`           | Server domain                    | `localhost` |
| `PROTOCOL`         | HTTP protocol                    | `http`      |
| `LOG_LEVEL`        | Logging level                    | `info`      |

## Architecture

- **Express**: HTTP server for health checks
- **ws**: WebSocket server for client connections
- **Deepgram SDK**: Real-time audio transcription
- **Pino**: Structured logging with minimal overhead
