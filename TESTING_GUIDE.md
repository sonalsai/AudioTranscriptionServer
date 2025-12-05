# Testing the Logging Implementation

## Quick Start Test

### 1. Start the Server

```bash
npm run dev
```

**Expected Output:**

```
[2025-12-05 16:36:33.256 +0530] INFO: AudioTranscription Server started successfully
    event: "server_started"
    port: 3000
    protocol: "http"
    domain: "localhost"
    httpUrl: "http://localhost:3000"
    wsUrl: "ws://localhost:3000"
```

✅ **Verify**: Server starts with structured log showing all connection details

---

### 2. Test HTTP Endpoint

```bash
curl http://localhost:3000/
```

**Expected Output in Logs:**

```
[2025-12-05 16:36:42.568 +0530] INFO: Health check endpoint accessed
    req: {
      "id": 1,
      "method": "GET",
      "url": "/",
      ...
    }

[2025-12-05 16:36:42.572 +0530] INFO: GET / completed
    res: {
      "statusCode": 200
    }
    responseTime: 5
```

✅ **Verify**:

- Request logged with full details
- Response logged with status code and time
- Response time is tracked

---

### 3. Test WebSocket Connection

Create a test file `test-ws.js`:

```javascript
const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:3000");

ws.on("open", () => {
  console.log("Connected to server");

  // Simulate sending audio data
  const audioChunk = Buffer.from("fake audio data");
  ws.send(audioChunk);
});

ws.on("message", (data) => {
  console.log("Received:", JSON.parse(data.toString()));
});

ws.on("close", () => {
  console.log("Disconnected");
});

// Close after 5 seconds
setTimeout(() => ws.close(), 5000);
```

Run the test:

```bash
node test-ws.js
```

**Expected Output in Server Logs:**

```
[2025-12-05 16:40:00.123 +0530] INFO: Client WebSocket connected
    event: "client_connected"
    connectionId: 1
    clientIp: "::1"
    totalConnections: 1

[2025-12-05 16:40:00.368 +0530] INFO: Connected to Deepgram WebSocket
    event: "deepgram_connected"
    connectionId: 1
    connectionTimeMs: 245

[2025-12-05 16:40:00.370 +0530] DEBUG: Ready signal sent to client
    event: "ready_signal_sent"
    connectionId: 1

[2025-12-05 16:40:00.500 +0530] DEBUG: Audio data forwarded to Deepgram
    event: "audio_forwarded"
    connectionId: 1
    bytesReceived: 15

[2025-12-05 16:40:05.123 +0530] INFO: Client WebSocket disconnected
    event: "client_disconnected"
    connectionId: 1
    code: 1000
    totalConnections: 0

[2025-12-05 16:40:05.124 +0530] DEBUG: Deepgram connection closed due to client disconnect
    event: "deepgram_cleanup"
    connectionId: 1

[2025-12-05 16:40:05.125 +0530] INFO: Deepgram WebSocket connection closed
    event: "deepgram_closed"
    connectionId: 1
    code: 1000
```

✅ **Verify**:

- Connection established with unique ID
- Deepgram connection time tracked
- Audio forwarding logged
- Clean disconnection logged
- Connection cleanup performed

---

### 4. Test Log Levels

**Set to DEBUG:**

```bash
LOG_LEVEL=debug npm run dev
```

You should see DEBUG logs like:

- `ready_signal_sent`
- `audio_forwarded`
- `deepgram_cleanup`

**Set to WARN:**

```bash
LOG_LEVEL=warn npm run dev
```

You should only see WARN, ERROR, and FATAL logs.

✅ **Verify**: Log level filtering works correctly

---

### 5. Test Error Logging

**Test missing API key:**

```bash
# Temporarily rename .env
mv .env .env.backup
npm run dev
```

**Expected Output:**

```
[2025-12-05 16:45:00.123 +0530] FATAL: DEEPGRAM_API_KEY not found in .env
    event: "config_error"
    missingVar: "DEEPGRAM_API_KEY"
```

✅ **Verify**: Fatal error logged and process exits

**Restore .env:**

```bash
mv .env.backup .env
```

---

### 6. Test Graceful Shutdown

Start the server:

```bash
npm run dev
```

Press `Ctrl+C`:

**Expected Output:**

```
^C[2025-12-05 16:46:00.123 +0530] INFO: SIGINT received, starting graceful shutdown
    event: "shutdown_initiated"

[2025-12-05 16:46:00.124 +0530] INFO: HTTP server closed
    event: "server_closed"
```

✅ **Verify**: Graceful shutdown logs appear

---

## Advanced Testing

### Test Multiple Connections

Create `test-multiple-ws.js`:

```javascript
const WebSocket = require("ws");

// Create 5 connections
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    const ws = new WebSocket("ws://localhost:3000");
    ws.on("open", () => console.log(`Connection ${i + 1} opened`));

    // Close after random time
    setTimeout(() => ws.close(), Math.random() * 5000 + 2000);
  }, i * 1000);
}
```

Run:

```bash
node test-multiple-ws.js
```

**Expected in Logs:**

```
connectionId: 1, totalConnections: 1
connectionId: 2, totalConnections: 2
connectionId: 3, totalConnections: 3
connectionId: 4, totalConnections: 4
connectionId: 5, totalConnections: 5
```

✅ **Verify**: Each connection gets unique ID and total count increases

---

### Test Log Filtering

**Filter errors only:**

```bash
npm run dev 2>&1 | grep "ERROR"
```

**Filter specific connection:**

```bash
npm run dev 2>&1 | grep "connectionId\":1"
```

**Filter Deepgram events:**

```bash
npm run dev 2>&1 | grep "deepgram"
```

**Filter by event type:**

```bash
npm run dev 2>&1 | grep "client_connected"
```

✅ **Verify**: Filtering works as expected

---

### Test Performance Metrics

Monitor connection times:

```bash
npm run dev 2>&1 | grep "connectionTimeMs"
```

Monitor response times:

```bash
npm run dev 2>&1 | grep "responseTime"
```

Monitor audio chunks:

```bash
npm run dev 2>&1 | grep "bytesReceived"
```

✅ **Verify**: Performance metrics are logged

---

## Production Testing

### Test Production Logger

1. Update `src/logger.js` to use the production example:

```bash
cp src/logger.production.example.js src/logger.js
```

2. Run in production mode:

```bash
NODE_ENV=production npm start
```

**Expected Output:**

```json
{
  "level": "INFO",
  "time": "2025-12-05T11:06:33.256Z",
  "env": "production",
  "service": "audio-transcription-server",
  "event": "server_started",
  "port": 3000,
  "msg": "AudioTranscription Server started successfully"
}
```

✅ **Verify**:

- Output is raw JSON (no pretty printing)
- Includes `env` and `service` fields
- No color codes

3. Restore development logger:

```bash
git checkout src/logger.js
```

---

## Checklist

### Basic Functionality

- [ ] Server starts with structured logs
- [ ] HTTP requests are logged
- [ ] Response times are tracked
- [ ] WebSocket connections are logged
- [ ] Connection IDs are unique
- [ ] Total connections are tracked

### Deepgram Integration

- [ ] Deepgram connection logged
- [ ] Connection time tracked
- [ ] Messages received logged
- [ ] Audio forwarding logged
- [ ] Deepgram errors logged
- [ ] Deepgram cleanup logged

### Error Handling

- [ ] Configuration errors logged (FATAL)
- [ ] Client errors logged (ERROR)
- [ ] Deepgram errors logged (ERROR)
- [ ] Parse errors logged (ERROR)
- [ ] Uncaught exceptions logged (FATAL)

### Log Levels

- [ ] DEBUG level shows debug logs
- [ ] INFO level hides debug logs
- [ ] WARN level shows only warnings and errors
- [ ] ERROR level shows only errors
- [ ] FATAL level shows only fatal errors

### Lifecycle

- [ ] Server start logged
- [ ] Graceful shutdown logged
- [ ] Connection lifecycle tracked
- [ ] Cleanup performed on disconnect

### Performance

- [ ] Connection time tracked
- [ ] Response time tracked
- [ ] Bytes received tracked
- [ ] Minimal performance overhead

### Production Readiness

- [ ] JSON output works
- [ ] Pretty printing can be disabled
- [ ] Sensitive data can be redacted
- [ ] Log aggregation ready

---

## Troubleshooting

### Issue: No logs appearing

**Solution**: Check `LOG_LEVEL` environment variable

### Issue: Too many logs

**Solution**: Set `LOG_LEVEL=warn` or `LOG_LEVEL=error`

### Issue: Can't see debug logs

**Solution**: Set `LOG_LEVEL=debug`

### Issue: Logs not pretty printed

**Solution**: Ensure `NODE_ENV` is not set to `production`

### Issue: Missing connection IDs

**Solution**: Ensure you're looking at WebSocket logs, not HTTP logs

---

## Success Criteria

✅ All logs are structured JSON
✅ All events have unique event types
✅ All connections have unique IDs
✅ All errors include stack traces
✅ All performance metrics are tracked
✅ Graceful shutdown works
✅ Log levels work correctly
✅ Production mode works

**STEP 1 is complete when all checkboxes are checked!**
