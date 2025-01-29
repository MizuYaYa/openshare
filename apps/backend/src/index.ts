import { readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use(compress(), etag(), secureHeaders(), logger());

app.get(
  "/host",
  upgradeWebSocket(() => {
    console.log("WebSocket connection established");
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send("Hello from server!");
      },
      onClose: () => {
        console.log("Connection closed");
      },
      onOpen: () => {
        console.log("Connection opened");
      },
      onError: error => {
        console.error(`WebSocket error: ${error}`);
      }
    };
  }),
).get("/", (c) => {
  return c.text("Hello, Hono!");
});

const port = 3000;
console.log(`Server is running on https://localhost:${port}`);

const server = serve({
  fetch: app.fetch,
  port,
  createServer: createSecureServer,
  serverOptions: {
    key: readFileSync("localhost-privkey.pem"),
    cert: readFileSync("localhost-cert.pem"),
    // biome-ignore lint/style/useNamingConvention: しょうがないので無視
    allowHTTP1: true
  },
});
injectWebSocket(server);
