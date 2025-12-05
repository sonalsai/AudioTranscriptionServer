# Logger Configuration Guide

## 📝 Overview

The logger automatically configures itself based on the environment, providing optimal settings for both development and production.

## 🔧 Configuration

### Environment Detection

The logger uses `NODE_ENV` to determine the environment:

```javascript
// Development (default)
NODE_ENV = development; // or not set

// Production
NODE_ENV = production;
```

## 🎨 Development Mode

**Features:**

- ✅ Pretty-printed, colorized output
- ✅ Debug level logging (more verbose)
- ✅ Human-readable timestamps
- ✅ Easy to read in terminal

**Example Output:**

```
[2025-12-05 19:55:00] INFO: Logger initialized
    environment: "development"
    logLevel: "debug"
    prettyPrint: true
```

## 🚀 Production Mode

**Features:**

- ✅ JSON output (optimized for log aggregation tools)
- ✅ Info level logging (less verbose)
- ✅ Sensitive data redaction
- ✅ Service metadata included
- ✅ Better performance (no pretty printing overhead)

**Example Output:**

```json
{
  "level": "INFO",
  "time": "2025-12-05T14:25:00.000Z",
  "env": "production",
  "service": "audio-transcription-server",
  "msg": "Logger initialized"
}
```

## 🔒 Security Features

### Automatic Redaction

The following sensitive fields are automatically redacted from logs:

- `req.headers.authorization`
- `req.headers.cookie`
- `deepgramApiKey`
- `*.password`
- `*.token`
- `*.apiKey`
- `*.secret`

**Example:**

```javascript
// This will be redacted
logger.info({ apiKey: "secret123" }, "API call");

// Output: { msg: "API call" } // apiKey removed
```

## 📊 Log Levels

### Available Levels (from most to least verbose):

1. **trace** - Very detailed debugging
2. **debug** - Debugging information
3. **info** - General information (default in production)
4. **warn** - Warning messages
5. **error** - Error messages
6. **fatal** - Fatal errors (application crash)

### Setting Log Level

```bash
# Via environment variable
LOG_LEVEL=debug npm start

# Or in .env file
LOG_LEVEL=debug
```

### Default Levels:

- **Development:** `debug`
- **Production:** `info`

## 💡 Usage Examples

### Basic Logging

```javascript
const logger = require("./utils/logger");

// Info level
logger.info("Server started");

// With structured data
logger.info({ port: 3000 }, "Server listening");

// Warning
logger.warn({ connectionId: 123 }, "Connection timeout");

// Error
logger.error({ error: err.message }, "Failed to connect");
```

### Event Logging

```javascript
// WebSocket events
logger.info(
  {
    event: "client_connected",
    connectionId: 1,
    clientIp: "192.168.1.1",
  },
  "Client connected"
);

// HTTP requests (handled by middleware)
// Automatically logged with request/response details
```

### Error Logging

```javascript
try {
  // Some operation
} catch (err) {
  logger.error(
    {
      event: "operation_failed",
      error: err.message,
      stack: err.stack,
    },
    "Operation failed"
  );
}
```

## 🎯 Best Practices

### 1. Use Structured Logging

**Good:**

```javascript
logger.info({ userId: 123, action: "login" }, "User logged in");
```

**Avoid:**

```javascript
logger.info("User 123 logged in");
```

### 2. Include Event Names

```javascript
logger.info({ event: "payment_processed", amount: 100 }, "Payment successful");
```

### 3. Use Appropriate Log Levels

- `debug` - Development debugging only
- `info` - Normal operations
- `warn` - Potential issues
- `error` - Errors that need attention
- `fatal` - Critical failures

### 4. Don't Log Sensitive Data

The logger will redact known sensitive fields, but avoid logging:

- Passwords
- API keys
- Tokens
- Personal information
- Credit card numbers

## 🔄 Switching Environments

### Development (Local)

```bash
npm run dev
# or
npm start
```

### Production

```bash
NODE_ENV=production npm start
```

## 📦 Logger Metadata

Every log includes:

```javascript
{
  "level": "INFO",           // Log level
  "time": "ISO timestamp",   // When it happened
  "env": "development",      // Environment
  "service": "audio-transcription-server",  // Service name
  "msg": "Log message",      // Your message
  // ... your custom fields
}
```

## 🛠️ Customization

### Override Log Level

```bash
# More verbose (development)
LOG_LEVEL=debug npm start

# Less verbose (production)
LOG_LEVEL=warn npm start

# Silent (only errors)
LOG_LEVEL=error npm start
```

### Force Production Mode

```bash
NODE_ENV=production npm start
```

### Force Development Mode

```bash
NODE_ENV=development npm start
```

## 📈 Log Aggregation (Production)

The JSON output in production is optimized for log aggregation tools:

- **Datadog**
- **Splunk**
- **ELK Stack (Elasticsearch, Logstash, Kibana)**
- **CloudWatch**
- **Loggly**

Simply pipe the output to your log aggregation service.

## ✅ Summary

| Feature          | Development    | Production |
| ---------------- | -------------- | ---------- |
| Format           | Pretty-printed | JSON       |
| Colors           | ✅ Yes         | ❌ No      |
| Default Level    | `debug`        | `info`     |
| Redaction        | ✅ Yes         | ✅ Yes     |
| Performance      | Standard       | Optimized  |
| Service Metadata | ✅ Yes         | ✅ Yes     |

---

**The logger is now unified and production-ready!** 🎉
