# `@opencode-ai/sdk` Reference

This document summarizes the `@opencode-ai/sdk` based on public documentation. It is used to migrate from the CLI approach to a programmatic Client-Server model.

## Installation
```bash
npm install @opencode-ai/sdk
```

## Creating a Server & Client
The SDK provides `createOpencode` to boot up the internal OpenCode server and return a strongly-typed client.

```typescript
import { createOpencode } from "@opencode-ai/sdk";

async function main() {
  const { client, server } = await createOpencode({
    port: 4096,
    config: {
      model: "anthropic/claude-3-5-sonnet-20241022",
    },
  });

  console.log(`Server running at ${server.url}`);

  // Gracefully close on shutdown
  await server.close();
}
```

## Connecting to an Existing Server
If running the server separately, you can just initialize the client.

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk";

const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
});

const health = await client.global.health();
```

## Session Management (Replaces `parseSessionId`)
Instead of passing `{session_id}` as a CLI argument and scraping the logs, use the native sessions API.

```typescript
// Create a new session
const session = await client.sessions.create({
  data: {
    title: "Task Title",
  }
});

// Prompt the session
const response = await client.sessions.prompt(session.id, {
  prompt: "Fix the error in src/api.ts",
});

// Structured response
console.log("Agent Response:", response.text);
// You can use session.id for subsequent prompts
```

## File Operations
File system tools are built in if you need to manipulate the workspace directly from the orchestrator instead of the agent.

```typescript
const content = await client.files.read({ path: "src/index.ts" });
await client.files.write({ path: "src/hello.ts", content: "console.log('Hello');" });
const matches = await client.files.status({ query: "TODO" });
```
