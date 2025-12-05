# Logging Architecture

## System Flow with Logging Points

```
┌─────────────────────────────────────────────────────────────────┐
│                     AudioTranscription Server                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Pino Logger                           │   │
│  │  • Structured JSON logs                                  │   │
│  │  • ISO timestamps                                        │   │
│  │  • Configurable log levels                               │   │
│  │  • Pretty printing (dev) / JSON (prod)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ▲                                   │
│                              │ All logs flow here                │
│                              │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   HTTP       │  │  WebSocket   │  │   Deepgram   │   │  │
│  │  │   Logging    │  │   Logging    │  │   Logging    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## HTTP Request Flow

```
Client HTTP Request
       │
       ▼
┌─────────────────┐
│  pino-http      │ ──► Log: Request received (method, URL, headers)
│  middleware     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Route Handler  │ ──► Log: Endpoint-specific actions
│  (GET /)        │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  pino-http      │ ──► Log: Response sent (status, time, headers)
│  middleware     │
└─────────────────┘
       │
       ▼
   Response
```

## WebSocket Connection Flow

```
Client WebSocket Connection
       │
       ▼
┌──────────────────────┐
│  ws.on('connection') │ ──► Log: client_connected
│                      │     (connectionId, clientIp, totalConnections)
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Create Deepgram WS  │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  deepgramWS.on       │ ──► Log: deepgram_connected
│  ('open')            │     (connectionId, connectionTimeMs)
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Send ready signal   │ ──► Log: ready_signal_sent (DEBUG)
└──────────────────────┘
       │
       ▼
   System Ready
```

## Audio Streaming Flow

```
Client sends audio chunk
       │
       ▼
┌──────────────────────┐
│  ws.on('message')    │
└──────────────────────┘
       │
       ▼
   Is Deepgram ready?
       │
       ├─── NO ──► Log: deepgram_not_ready (WARN)
       │           (drop message)
       │
       └─── YES
              │
              ▼
       ┌──────────────────────┐
       │  Forward to Deepgram │ ──► Log: audio_forwarded (DEBUG)
       │                      │     (connectionId, bytesReceived)
       └──────────────────────┘
              │
              ▼
       Deepgram processes
              │
              ▼
       ┌──────────────────────┐
       │  deepgramWS.on       │ ──► Log: deepgram_message_received (DEBUG)
       │  ('message')         │     (messageType, hasTranscript)
       └──────────────────────┘
              │
              ▼
       ┌──────────────────────┐
       │  Forward to client   │
       └──────────────────────┘
              │
              ▼
       Client receives transcript
```

## Error Handling Flow

```
Error Occurs
    │
    ├─── Deepgram Error ──► Log: deepgram_error (ERROR)
    │                       (error, code, stack)
    │
    ├─── Client Error ──► Log: client_error (ERROR)
    │                     (error, code, stack)
    │
    ├─── Parse Error ──► Log: deepgram_parse_error (ERROR)
    │                    (error, stack)
    │
    ├─── Config Error ──► Log: config_error (FATAL)
    │                     (missingVar)
    │                     → Exit process
    │
    ├─── Uncaught Exception ──► Log: uncaught_exception (FATAL)
    │                            (error, stack)
    │                            → Exit process
    │
    └─── Unhandled Rejection ──► Log: unhandled_rejection (FATAL)
                                  (reason, promise)
                                  → Exit process
```

## Connection Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Connection Lifecycle                      │
└─────────────────────────────────────────────────────────────┘

1. Client Connects
   ├─► Log: client_connected (INFO)
   └─► Assign connectionId: 1

2. Deepgram Connection
   ├─► Start timer
   ├─► Connect to Deepgram
   ├─► Log: deepgram_connected (INFO)
   └─► Record connectionTimeMs

3. Active Streaming
   ├─► Log: audio_forwarded (DEBUG) for each chunk
   └─► Log: deepgram_message_received (DEBUG) for each response

4. Client Disconnects
   ├─► Log: client_disconnected (INFO)
   ├─► Close Deepgram connection
   └─► Log: deepgram_cleanup (DEBUG)

5. Deepgram Closes
   └─► Log: deepgram_closed (INFO)
```

## Log Level Filtering

```
┌────────────────────────────────────────────────────────────┐
│  LOG_LEVEL=trace  │  All logs (very verbose)               │
│  LOG_LEVEL=debug  │  Debug + Info + Warn + Error + Fatal   │
│  LOG_LEVEL=info   │  Info + Warn + Error + Fatal [DEFAULT] │
│  LOG_LEVEL=warn   │  Warn + Error + Fatal                  │
│  LOG_LEVEL=error  │  Error + Fatal                         │
│  LOG_LEVEL=fatal  │  Fatal only                            │
└────────────────────────────────────────────────────────────┘

Development:   LOG_LEVEL=debug  (see everything)
Production:    LOG_LEVEL=info   (balanced)
High Traffic:  LOG_LEVEL=warn   (errors and warnings only)
```

## Log Aggregation Pipeline

```
┌─────────────────┐
│  Pino Logger    │
│  (JSON output)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  stdout/stderr  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Log Shipper    │────▶│  Elasticsearch   │
│  (Filebeat,     │     │  Datadog         │
│   Fluentd, etc) │     │  CloudWatch      │
└─────────────────┘     │  Grafana Loki    │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Visualization   │
                        │  & Alerting      │
                        └──────────────────┘
```

## Key Metrics Tracked

```
Performance Metrics:
├─► connectionTimeMs    (Deepgram connection time)
├─► responseTime        (HTTP response time)
└─► bytesReceived       (Audio chunk size)

Connection Metrics:
├─► totalConnections    (Active WebSocket connections)
├─► connectionId        (Unique connection identifier)
└─► clientIp            (Client IP address)

Message Metrics:
├─► messageType         (Type of Deepgram message)
├─► hasTranscript       (Whether transcript is present)
└─► event               (Event type for filtering)

Error Metrics:
├─► error               (Error message)
├─► code                (Error code)
└─► stack               (Stack trace)
```

## Monitoring Dashboard Example

```
┌─────────────────────────────────────────────────────────────┐
│                  Server Health Dashboard                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Active Connections: 42                                      │
│  Avg Connection Time: 245ms                                  │
│  Avg Response Time: 12ms                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Error Rate (last 1h)                              │    │
│  │  ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2%  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Recent Errors:                                              │
│  • deepgram_error: Connection timeout (2 occurrences)       │
│  • client_error: Connection reset (1 occurrence)            │
│                                                              │
│  Top Events (last 5m):                                       │
│  • audio_forwarded: 1,234                                   │
│  • deepgram_message_received: 1,189                         │
│  • client_connected: 12                                     │
│  • client_disconnected: 8                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
