export type ServerMessageType = ServerMessage["type"];
export type SenderMessageType = SenderMessage["type"];
export type ReciverMessageType = ReciverMessage["type"];

export type RoomId = string;

export type ClientData = {
  os: string;
  browser: string;
};

export type ConnectionRequest = {
  sdp: string;
  clientData: ClientData;
};

export type ConnectionResponse = string | boolean;

export type Error = "INVALID_ROOM_ID"

export type ServerMessage =
  | { type: "roomId"; message: RoomId }
  | { type: "connectionRequest"; message: ConnectionRequest }
  | { type: "error" ; message: Error };

export type SenderMessage =
  | { type: "connectionResponse"; message: ConnectionResponse }
  | { type: "clientData"; message: ClientData };

export type ReciverMessage = { type: "connectionRequest"; message: ConnectionRequest };
