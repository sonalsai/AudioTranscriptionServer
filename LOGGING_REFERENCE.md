# Logging Quick Reference

## Event Types

### Server Lifecycle

| Event                 | Level | Description                                |
| --------------------- | ----- | ------------------------------------------ |
| `server_started`      | INFO  | Server successfully started and listening  |
| `shutdown_initiated`  | INFO  | Graceful shutdown started (SIGTERM/SIGINT) |
| `server_closed`       | INFO  | HTTP server closed successfully            |
| `config_error`        | FATAL | Configuration error (missing env vars)     |
| `uncaught_exception`  | FATAL | Uncaught exception occurred                |
| `unhandled_rejection` | FATAL | Unhandled promise rejection                |

### WebSocket - Client

| Event                 | Level | Description                          |
| --------------------- | ----- | ------------------------------------ |
| `client_connected`    | INFO  | Client WebSocket connected           |
| `client_disconnected` | INFO  | Client WebSocket disconnected        |
| `client_error`        | ERROR | Client WebSocket error               |
| `client_not_ready`    | WARN  | Client not ready to receive messages |

### WebSocket - Deepgram

| Event                       | Level | Description                         |
| --------------------------- | ----- | ----------------------------------- |
| `deepgram_connected`        | INFO  | Connected to Deepgram WebSocket     |
| `deepgram_closed`           | INFO  | Deepgram connection closed          |
| `deepgram_error`            | ERROR | Deepgram WebSocket error            |
| `deepgram_message_received` | DEBUG | Message received from Deepgram      |
| `deepgram_parse_error`      | ERROR | Failed to parse Deepgram message    |
| `deepgram_not_ready`        | WARN  | Deepgram not ready, message dropped |
| `deepgram_cleanup`          | DEBUG | Deepgram connection cleaned up      |

### Data Flow

| Event               | Level | Description                      |
| ------------------- | ----- | -------------------------------- |
| `audio_forwarded`   | DEBUG | Audio data forwarded to Deepgram |
| `ready_signal_sent` | DEBUG | Ready signal sent to client      |

### HTTP Requests

| Event        | Level | Description                      |
| ------------ | ----- | -------------------------------- |
| HTTP request | INFO  | Automatic HTTP request logging   |
| HTTP error   | ERROR | HTTP request failed (5xx errors) |
| HTTP warning | WARN  | HTTP client error (4xx errors)   |

## Log Fields Reference

### Common Fields

- `event`: Event type identifier
- `connectionId`: Unique connection identifier
- `time`: ISO timestamp
- `level`: Log level

### Connection-Specific

- `clientIp`: Client IP address
- `totalConnections`: Current number of active connections
- `connectionTimeMs`: Time to establish connection (ms)

### Message-Specific

- `messageType`: Type of Deepgram message
- `hasTranscript`: Whether message contains transcript
- `bytesReceived`: Size of audio chunk

### Error-Specific

- `error`: Error message
- `code`: Error code (if available)
- `stack`: Stack trace
- `reason`: Close/error reason

## Common Grep Patterns

```bash
# All errors
npm run dev | grep -E "(ERROR|FATAL)"

# Connection lifecycle
npm run dev | grep -E "(connected|disconnected)"

# Deepgram events only
npm run dev | grep "deepgram"

# Specific connection
npm run dev | grep "connectionId\":5"

# Audio data flow
npm run dev | grep "audio_forwarded"

# Performance metrics
npm run dev | grep -E "(connectionTimeMs|responseTime|bytesReceived)"

# Warnings and errors
npm run dev | grep -E "(WARN|ERROR|FATAL)"
```

## Log Level Hierarchy

```
FATAL (60) - System is unusable
  ↓
ERROR (50) - Error conditions
  ↓
WARN  (40) - Warning conditions
  ↓
INFO  (30) - Informational messages [DEFAULT]
  ↓
DEBUG (20) - Debug messages
  ↓
TRACE (10) - Very detailed tracing
```

Setting `LOG_LEVEL=warn` will show WARN, ERROR, and FATAL logs only.

## Production Recommendations

1. **Set LOG_LEVEL=info** (or warn for high-traffic systems)
2. **Disable pretty printing** for better performance
3. **Pipe to log aggregation** (Datadog, CloudWatch, etc.)
4. **Monitor these events**:
   - `deepgram_error`
   - `client_error`
   - `deepgram_not_ready`
   - `uncaught_exception`
   - `unhandled_rejection`

## Debugging Scenarios

### Scenario: Messages being dropped

```bash
npm run dev | grep "deepgram_not_ready"
```

Look for `deepgramReady` and `deepgramState` fields.

### Scenario: Connection issues

```bash
npm run dev | grep -E "(client_connected|deepgram_connected|connectionTimeMs)"
```

Check `connectionTimeMs` for slow Deepgram connections.

### Scenario: Transcription not working

```bash
npm run dev | grep -E "(audio_forwarded|deepgram_message_received|hasTranscript)"
```

Verify audio is being forwarded and transcripts are received.

### Scenario: Performance issues

```bash
npm run dev | grep -E "(responseTime|connectionTimeMs|bytesReceived)"
```

Monitor timing and data volume metrics.
