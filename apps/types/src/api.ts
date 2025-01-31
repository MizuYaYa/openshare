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
export type ConnectionRequestWithId = ConnectionRequest & { id: string };

export type ConnectionResponse = { ok: true; sdp: string; reciverId: string } | { ok: false; reciverId: string };

export type ConnectionResponseToReciver = { ok: true; sdp: string; clientData: ClientData } | { ok: false };

export type Error = "INVALID_ROOM_ID" | "INVALID_RECIVER_ID";

export type Ice = { ice: string };

export type IceWithId = Ice & { id: string };

export type ServerMessage =
  | { type: "roomId"; message: RoomId }
  | { type: "connectionRequest"; message: ConnectionRequestWithId }
  | { type: "connectionResponse"; message: ConnectionResponseToReciver }
  | { type: "error"; message: Error }
  | { type: "ice"; message: IceWithId };

export type SenderMessage =
  | { type: "connectionResponse"; message: ConnectionResponse }
  | { type: "clientData"; message: ClientData };

export type ReciverMessage = { type: "connectionRequest"; message: ConnectionRequest } | { type: "ice"; message: Ice };
