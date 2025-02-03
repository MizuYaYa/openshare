export type ServerMessageType = ServerMessage["type"];
export type SenderMessageType = SenderMessage["type"];
export type ReceiverMessageType = ReceiverMessage["type"];

export type RoomId = string;

export type ClientData = {
  os: string;
  browser: string;
};

export type ConnectionRequest = {
  sdp: string;
  clientData: ClientData;
};
export type ConnectionRequestWithId = ConnectionRequest & { id: string };

export type ConnectionResponse = { ok: true; sdp: string; receiverId: string } | { ok: false; receiverId: string };

export type ConnectionResponseToReceiver = { ok: true; sdp: string; clientData: ClientData } | { ok: false };

export type Error = "INVALID_ROOM_ID" | "INVALID_RECEIVER_ID";

export type Ice = { ice: string; id?: string };

export type ConnectionState = { id: string; state: "disconnected" };

export type ServerMessage =
  | { type: "roomId"; message: RoomId }
  | { type: "connectionRequest"; message: ConnectionRequestWithId }
  | { type: "connectionResponse"; message: ConnectionResponseToReceiver }
  | { type: "error"; message: Error }
  | { type: "ice"; message: Ice }
  | { type: "connectionState"; message: ConnectionState };

export type SenderMessage =
  | { type: "connectionResponse"; message: ConnectionResponse }
  | { type: "clientData"; message: ClientData }
  | { type: "ice"; message: Ice };

export type ReceiverMessage = { type: "connectionRequest"; message: ConnectionRequest } | { type: "ice"; message: Ice };
