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
import type { ClientData, ReceiverMessage, SenderMessage, ServerMessage } from "openshare";
import { ulid } from "ulid";
import { appConfig } from "./config/app.js";
import { createTurnCredential } from "./turn.js";

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
  lastReaction: Date;
};
const connections = new Map<string, Connection & { receivers: (Connection & { id: string })[] }>();

setInterval(() => {
  for (const [roomId, connection] of connections) {
    for (const receiver of connection.receivers) {
      if (receiver.lastReaction.getTime() + 120000 < Date.now()) {
        log.debug(`Connection timeout ${receiver.id}`);
        receiver.ws.close();
      } else {
        const c: ServerMessage = { type: "ping" };
        receiver.ws.send(JSON.stringify(c));
      }
    }
    if (connection.lastReaction.getTime() + 120000 < Date.now()) {
      log.debug(`Connection timeout ${roomId}`);
      for (const receiver of connection.receivers) {
        const c: ServerMessage = { type: "connectionState", message: { state: "disconnected", id: receiver.id } };
        receiver.ws.send(JSON.stringify(c));
        receiver.ws.close();
      }
      connection.ws.close();
    } else {
      const c: ServerMessage = { type: "ping" };
      connection.ws.send(JSON.stringify(c));
    }
  }
}, 60000);

app
  .get(
    "/host",
    upgradeWebSocket((c) => {
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

              createTurnCredential()
                .then((credential) => {
                  const c: ServerMessage = { type: "turn", message: credential };
                  ws.send(JSON.stringify(c));
                })
                .catch((error) => {
                  log.warn("Failed to create turn credentials: ", error);
                  const errorMsg: ServerMessage = { type: "error", message: "CANNOT_USE_TURN" };
                  ws.send(JSON.stringify(errorMsg));
                });

              break;
            }

            case "connectionResponse": {
              const connection = connections.get(roomId);
              if (!connection) {
                throw new Error("connection not found");
              }
              if (data.message.ok) {
                const receiver = connection.receivers?.find((r) => r.id === data.message.receiverId);
                if (!receiver) {
                  const c: ServerMessage = { type: "error", message: "INVALID_RECEIVER_ID" };
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
                receiver.ws.send(JSON.stringify(r));
              }

              break;
            }

            case "ice": {
              const receiver = connections.get(roomId)?.receivers?.find((r) => r.id === data.message.id);
              if (!receiver) {
                const r: ServerMessage = { type: "error", message: "INVALID_RECEIVER_ID" };
                ws.send(JSON.stringify(r));
                return;
              }

              const c: ServerMessage = { type: "ice", message: { ice: data.message.ice } };
              receiver.ws.send(JSON.stringify(c));

              break;
            }

            case "pong": {
              const connection = connections.get(roomId);
              if (connection) {
                connection.lastReaction = new Date();
              }
              break;
            }

            default:
              break;
          }
        },
        onClose: () => {
          log.debug(`connection closed ${roomId}`);
          for (const receiver of connections.get(roomId)?.receivers || []) {
            const c: ServerMessage = { type: "connectionState", message: { state: "disconnected", id: receiver.id } };
            receiver.ws.send(JSON.stringify(c));
            receiver.ws.close();
          }
          connections.delete(roomId);
        },
        onOpen: (event, ws) => {
          log.debug(`connection opened ${roomId}`);

          connections.set(roomId, { ws, ip: remote.address, receivers: [], lastReaction: new Date() });
          const c: ServerMessage = { type: "roomId", message: roomId };
          ws.send(JSON.stringify(c));
        },
        onError: (error) => {
          log.error("WebSocket error: ", error);
        },
      };
    }),
  )
  .get(
    "/connect/:roomId",
    upgradeWebSocket((c) => {
      const { remote } = getConnInfo(c);
      const roomId = c.req.param("roomId");
      const receiverId = c.get("requestId");

      log.debug(`receiver WS connection established from ${remote.address} using ${remote.addressType} ${roomId}`);
      return {
        onMessage(event, ws) {
          log.trace(`Message from receiver: ${event.data.toString()}`);
          const data: ReceiverMessage = JSON.parse(event.data.toString());
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

              sender.receivers.push({
                ws,
                ip: remote.address,
                clientData: data.message.clientData,
                id: receiverId,
                lastReaction: new Date(),
              });

              const c: ServerMessage = {
                type: "connectionRequest",
                message: { sdp: data.message.sdp, clientData: data.message.clientData, id: receiverId },
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

              const c: ServerMessage = { type: "ice", message: { ice: data.message.ice, id: receiverId } };
              sender.ws.send(JSON.stringify(c));

              break;
            }

            case "pong": {
              const sender = connections.get(roomId);
              if (sender) {
                const receiver = sender.receivers.find((r) => r.id === receiverId);
                if (receiver) {
                  receiver.lastReaction = new Date();
                }
              }
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
            const receiverIndex = sender.receivers?.findIndex((r) => r.id === receiverId);
            if (receiverIndex !== -1) {
              sender.receivers?.splice(receiverIndex, 1);
            }
            const c: ServerMessage = { type: "connectionState", message: { state: "disconnected", id: receiverId } };
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
        onError: (error) => {
          log.error("WebSocket error: ", error);
        },
      };
    }),
  );
// .get("/", c => {
//   return c.json({
//     connections: Array.from(connections).map(([roomId, connection]) => {
//       return {
//         roomId,
//         senderIp: connection.ip,
//         clientData: connection.clientData,
//         receivers: connection.receivers?.map(r => ({ ip: r.ip, clientData: r.clientData, id: r.id })),
//       };
//     }),
//     numberOfConnections: connections.size,
//   });
// });

log.info(`Server is running on https://localhost:${appConfig.app.port}`);

const server = serve({
  fetch: app.fetch,
  port: appConfig.app.port,
  createServer: createSecureServer,
  serverOptions: {
    key: readFileSync("localhost-privkey.pem"),
    cert: readFileSync("localhost-cert.pem"),
    allowHTTP1: true,
  },
});
injectWebSocket(server);
