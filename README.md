# Audio Transcription Server

This project provides a real-time audio transcription service using Deepgram.

## Setup

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Create a `.env` file:**

    Create a `.env` file in the root of the project and add your Deepgram API key:

    ```
    DEEPGRAM_API_KEY=YOUR_DEEPGRAM_API_KEY
    ```

3.  **Start the server:**

    ```bash
    npm start
    ```

## Usage

-   The server will be running at `http://localhost:3000`.
-   The WebSocket server will be running at `ws://localhost:3000`.

## Development

To run the server in development mode (with auto-reloading):

```bash
npm run dev
```
