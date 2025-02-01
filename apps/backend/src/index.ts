import { readFileSync } from "node:fs";
import { createSecureServer } from "node:http2";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { WSContext } from "hono/ws";
import log4js from "log4js";
import type { ClientData, ReciverMessage, SenderMessage, ServerMessage } from "openshare";
import { ulid } from "ulid";

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
  clientData?: ClientData;
  ip?: string;
};
const connections = new Map<string, Connection & { recivers: (Connection & { id: string })[] }>();

app
  .get(
    "/host",
    upgradeWebSocket(c => {
      const { remote } = getConnInfo(c);
      const roomId = c.get("requestId");

      log.debug(`WS connection established from ${remote.address} using ${remote.addressType} ${roomId}`);
      return {
        onMessage(event, ws) {
          log.trace(`Message from client: ${event.data}`);
          const data: SenderMessage = JSON.parse(event.data.toString());
          switch (data.type) {
            case "clientData": {
              const connection = connections.get(roomId);
              if (connection) {
                connection.clientData = data.message;
              }

              break;
            }
            case "connectionResponse": {
              const connection = connections.get(roomId);
              if (!connection) {
                throw new Error("connection not found");
              }
              if (data.message.ok) {
                const reciver = connection.recivers?.find(r => r.id === data.message.reciverId);
                if (!reciver) {
                  const c: ServerMessage = { type: "error", message: "INVALID_RECIVER_ID" };
                  ws.send(JSON.stringify(c));
                  return;
                }

                if (!connection.clientData) {
                  throw new Error("clientData is empty");
                }
                const r: ServerMessage = {
                  type: "connectionResponse",
                  message: { ok: true, sdp: data.message.sdp, clientData: connection.clientData },
                };
                reciver.ws.send(JSON.stringify(r));
              }

              break;
            }

            default:
              break;
          }
        },
        onClose: () => {
          log.debug(`connection closed ${roomId}`);
          for (const reciver of connections.get(roomId)?.recivers || []) {
            reciver.ws.close();
          }
          connections.delete(roomId);
        },
        onOpen: (event, ws) => {
          log.debug(`connection opened ${roomId}`);

          connections.set(roomId, { ws, ip: remote.address, recivers: [] });
          const c: ServerMessage = { type: "roomId", message: roomId };
          ws.send(JSON.stringify(c));
        },
        onError: error => {
          log.error("WebSocket error: ", error);
        },
      };
    }),
  )
  .get(
    "/connect/:roomId",
    upgradeWebSocket(c => {
      const { remote } = getConnInfo(c);
      const roomId = c.req.param("roomId");
      const reciverId = c.get("requestId");

      log.debug(`reciver WS connection established from ${remote.address} using ${remote.addressType} ${roomId}`);
      return {
        onMessage(event, ws) {
          log.trace(`Message from reciver: ${event.data.toString()}`);
          const data: ReciverMessage = JSON.parse(event.data.toString());
          switch (data.type) {
            case "connectionRequest": {
              const sender = connections.get(roomId);

              if (!sender) {
                log.debug(`sender not found connection closed ${roomId}`);
                const r: ServerMessage = { type: "error", message: "INVALID_ROOM_ID" };
                ws.send(JSON.stringify(r));
                ws.close();
                return;
              }

              sender.recivers.push({ ws, ip: remote.address, clientData: data.message.clientData, id: reciverId });

              const c: ServerMessage = {
                type: "connectionRequest",
                message: { sdp: data.message.sdp, clientData: data.message.clientData, id: reciverId },
              };
              sender.ws.send(JSON.stringify(c));

              break;
            }
            case "ice": {
              const sender = connections.get(roomId);
              if (!sender) {
                log.debug(`sender not found connection closed ${roomId}`);
                const r: ServerMessage = { type: "error", message: "INVALID_ROOM_ID" };
                ws.send(JSON.stringify(r));
                ws.close();
                return;
              }

              const c: ServerMessage = { type: "ice", message: { ice: data.message.ice, id: reciverId } };
              sender.ws.send(JSON.stringify(c));

              break;
            }
            default:
              break;
          }
        },
        onClose: () => {
          log.debug(`connection closed ${roomId}`);
          const sender = connections.get(roomId);
          if (sender) {
            const reciverIndex = sender.recivers?.findIndex(r => r.id === reciverId);
            if (reciverIndex !== -1) {
              sender.recivers?.splice(reciverIndex, 1);
            }
            const c: ServerMessage = { type: "connectionState", message: { state: "disconnected", id: reciverId } };
            sender.ws.send(JSON.stringify(c));
          }
        },
        onOpen: (event, ws) => {
          log.debug(`connection opened ${roomId}`);

          if (!connections.has(roomId)) {
            const r: ServerMessage = { type: "error", message: "INVALID_ROOM_ID" };
            ws.send(JSON.stringify(r));
            ws.close();
            return;
          }
        },
        onError: error => {
          log.error("WebSocket error: ", error);
        },
      };
    }),
  )
  .get("/", c => {
    return c.json({
      connections: Array.from(connections).map(([roomId, connection]) => {
        return {
          roomId,
          senderIp: connection.ip,
          clientData: connection.clientData,
          recivers: connection.recivers?.map(r => ({ ip: r.ip, clientData: r.clientData, id: r.id })),
        };
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
    allowHTTP1: true,
  },
});
injectWebSocket(server);
