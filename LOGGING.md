# Logging Documentation

## Overview

This server uses **Pino** for structured, high-performance logging. All logs are formatted with timestamps, log levels, and contextual information.

## Log Levels

- **fatal**: System-critical errors that require immediate shutdown
- **error**: Runtime errors that need attention
- **warn**: Warning conditions (e.g., dropped messages, client not ready)
- **info**: General informational messages (connections, disconnections, server start)
- **debug**: Detailed debugging information (message forwarding, state changes)
- **trace**: Very detailed tracing information

## Configuration

### Environment Variables

Set the log level using the `LOG_LEVEL` environment variable in your `.env` file:

```env
LOG_LEVEL=info  # Options: fatal, error, warn, info, debug, trace
```

Default: `info`

## Log Categories

### 1. HTTP Request Logs

Every HTTP request is automatically logged with:

- Request method and URL
- Response status code
- Response time
- Request ID (for tracing)

**Example:**

```json
{
  "level": "INFO",
  "time": "2025-12-05T11:03:34.123Z",
  "msg": "GET / completed",
  "req": {
    "method": "GET",
    "url": "/"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 5
}
```

### 2. WebSocket Connection Logs

#### Client Connection

```json
{
  "level": "INFO",
  "event": "client_connected",
  "connectionId": 1,
  "clientIp": "::1",
  "totalConnections": 1,
  "msg": "Client WebSocket connected"
}
```

#### Client Disconnection

```json
{
  "level": "INFO",
  "event": "client_disconnected",
  "connectionId": 1,
  "code": 1000,
  "reason": "",
  "totalConnections": 0,
  "msg": "Client WebSocket disconnected"
}
```

### 3. Deepgram Stream Lifecycle Logs

#### Deepgram Connection Established

```json
{
  "level": "INFO",
  "event": "deepgram_connected",
  "connectionId": 1,
  "connectionTimeMs": 245,
  "msg": "Connected to Deepgram WebSocket"
}
```

#### Deepgram Message Received

```json
{
  "level": "DEBUG",
  "event": "deepgram_message_received",
  "connectionId": 1,
  "messageType": "Results",
  "hasTranscript": true,
  "msg": "Received message from Deepgram"
}
```

#### Deepgram Connection Closed

```json
{
  "level": "INFO",
  "event": "deepgram_closed",
  "connectionId": 1,
  "code": 1000,
  "reason": "Normal closure",
  "msg": "Deepgram WebSocket connection closed"
}
```

### 4. Error Logs

#### Deepgram Error

```json
{
  "level": "ERROR",
  "event": "deepgram_error",
  "connectionId": 1,
  "error": "Connection timeout",
  "code": "ETIMEDOUT",
  "stack": "...",
  "msg": "Deepgram WebSocket error occurred"
}
```

#### Client WebSocket Error

```json
{
  "level": "ERROR",
  "event": "client_error",
  "connectionId": 1,
  "error": "Connection reset",
  "msg": "Client WebSocket error occurred"
}
```

#### Configuration Error

```json
{
  "level": "FATAL",
  "event": "config_error",
  "missingVar": "DEEPGRAM_API_KEY",
  "msg": "DEEPGRAM_API_KEY not found in .env"
}
```

## Monitoring & Debugging

### Connection Tracking

Each WebSocket connection is assigned a unique `connectionId` that appears in all related logs. Use this to trace the lifecycle of a specific connection:

```bash
# Filter logs for a specific connection
npm run dev | grep "connectionId\":1"
```

### Performance Monitoring

- **connectionTimeMs**: Time taken to establish Deepgram connection
- **bytesReceived**: Size of audio chunks being forwarded
- **responseTime**: HTTP request duration

### Common Debug Scenarios

#### 1. Dropped Messages

Look for logs with `event: "deepgram_not_ready"`:

```bash
npm run dev | grep "deepgram_not_ready"
```

#### 2. Connection Issues

Monitor connection lifecycle:

```bash
npm run dev | grep -E "(client_connected|client_disconnected|deepgram_connected|deepgram_closed)"
```

#### 3. Errors Only

```bash
npm run dev | grep -E "(ERROR|FATAL)"
```

## Production Logging

For production, you may want to:

1. **Disable pretty printing** (for better performance and machine parsing)
2. **Use JSON output** for log aggregation tools
3. **Set appropriate log level** (info or warn)

### Production Logger Configuration

Update `src/logger.js` for production:

```javascript
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Remove transport for production (raw JSON output)
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});
```

## Log Aggregation

Pino's JSON output works seamlessly with:

- **Elasticsearch + Kibana**
- **Datadog**
- **New Relic**
- **CloudWatch Logs**
- **Grafana Loki**

Simply pipe the output to your log aggregation service.

## Best Practices

1. **Always include event type**: Makes filtering easier
2. **Use structured data**: Add context as JSON fields, not in the message
3. **Include connection IDs**: Essential for debugging distributed systems
4. **Log at appropriate levels**: Don't spam with debug logs in production
5. **Include error stacks**: Critical for debugging failures

## Troubleshooting

### No logs appearing?

Check that `LOG_LEVEL` is set correctly. If set to `error`, you won't see `info` or `debug` logs.

### Logs too verbose?

Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` in production.

### Want to see audio data flow?

Set `LOG_LEVEL=debug` to see every audio chunk being forwarded.
