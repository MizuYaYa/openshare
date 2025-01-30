import { readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { ulid } from "ulid";
import { getConnInfo } from '@hono/node-server/conninfo'
import type { WSContext } from "hono/ws";
import log4js from "log4js";

const log = log4js.getLogger();
log.level = "all";

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use(
  compress(),
  etag(),
  secureHeaders(),
  logger((str, ...rest) => {
    log.trace(str, ...rest);
  }),
  requestId({ generator: () => ulid() }),
);

type Connection = {
  ws: WSContext<WebSocket>;
  ip?: string;
};
const connections = new Map<string, Connection & { recivers?: Connection[] }>();

app.get(
  "/host",
  upgradeWebSocket((c) => {
    const { remote } = getConnInfo(c);
    const roomId = c.get("requestId");

    log.debug(`WS connection established from ${remote.address} using ${remote.addressType} ${roomId}`);
    return {
      onMessage(event, ws) {
        log.trace(`Message from client: ${event.data}`);
      },
      onClose: () => {
        log.debug(`connection closed ${roomId}`);
        connections.delete(roomId);
      },
      onOpen: (event, ws) => {
        log.debug(`connection opened ${roomId}`);

        connections.set(roomId, { ws, ip: remote.address });
        ws.send(`Hello from server! ${roomId}`);
      },
      onError: error => {
        log.error("WebSocket error: ", error);
      }
    };
  }),
).get("/", (c) => {
  return c.json({
    connections: Array.from(connections).map(([roomId, connections]) => {
      return { roomId, senderIp: connections.ip, reciverIps: connections.recivers };
    }),
    numberOfConnections: connections.size,
  });
});

const port = 3000;
log.info(`Server is running on https://localhost:${port}`);

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
