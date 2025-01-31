import type { ClientData, ConnectionRequestWithId } from "openshare";

// biome-ignore lint/style/useNamingConvention: 仕方ない
export class RTCSession {
  connections: Map<
    string,
    { clientData: ClientData; connection: RTCPeerConnection; dataChannel: RTCDataChannel | undefined }
  >;
  constructor() {
    this.connections = new Map();
  }

  newConnection(connectionData: ConnectionRequestWithId) {
    const rtc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.cloudflare.com:3478",
        },
      ],
    });

    this.connections.set(connectionData.id, {
      clientData: connectionData.clientData,
      connection: rtc,
      dataChannel: this._rtcDataChannel(rtc),
    });
    return rtc;
  }
  _rtcDataChannel(rtc: RTCPeerConnection) {
    rtc.ondatachannel = e => {
      e.channel.binaryType = "arraybuffer";
      e.channel.addEventListener("message", event => {
        console.log(`Message from sender: ${event.data}`);
      });
      e.channel.addEventListener("open", () => {
        console.log("DataChannel opened");
      });

      return e.channel;
    };
    return undefined;
  }
}
