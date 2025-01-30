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


const connections = new Map<string, {ws: WSContext<WebSocket>, clientIp: string | undefined }[]>();

app.get(
  "/host",
  upgradeWebSocket((c) => {
    const { remote } = getConnInfo(c);

    log.debug(`WS connection established from ${remote.address} using ${remote.addressType} ${c.get("requestId")}`);
    return {
      onMessage(event, ws) {
        log.trace(`Message from client: ${event.data}`);
      },
      onClose: () => {
        log.debug(`${c.get("requestId")} connection closed`);
        connections.delete(c.get("requestId"))
      },
      onOpen: (event, ws) => {
        log.debug(`connection opened ${c.get("requestId")}`);
        const info = getConnInfo(c)
        const isConnection = connections.get(c.get("requestId"))
        if (isConnection) {
          isConnection.push({ws, clientIp: info.remote.address})
        } else {
          connections.set(c.get("requestId"), [{ws, clientIp: info.remote.address}])
        }
        ws.send(`Hello from server! ${c.get("requestId")}`);
      },
      onError: error => {
        log.error("WebSocket error: ", error);
      }
    };
  }),
).get("/", (c) => {

  // こういう形式になる {connections: [{roomId: string, clientIps: string[]}]}
  return c.json({connections: Array.from(connections).map(([roomId, connections]) => { return {roomId, clientIps: connections.map(connection => connection.clientIp)}})});
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
