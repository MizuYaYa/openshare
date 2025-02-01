import type { ClientData, ConnectionRequestWithId } from "openshare";

// biome-ignore lint/style/useNamingConvention: 仕方ない
export class RTCSession {
  connections: Map<string, { clientData: ClientData; connection: RTCPeerConnection; dataChannel?: RTCDataChannel }>;
  maxChunkSize: number;
  constructor() {
    this.connections = new Map();
    this.maxChunkSize = 16 * 1024;
  }

  newConnection(connectionData: ConnectionRequestWithId) {
    const rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });

    this.connections.set(connectionData.id, {
      clientData: connectionData.clientData,
      connection: rtc,
    });
    return rtc;
  }

  async setDataChannel(id: string, rtc: RTCPeerConnection) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.dataChannel = await this._rtcDataChannel(rtc);
      console.log("DataChannel created");
    } else {
      throw new Error(`${id} connection not found`);
    }
  }

  private _rtcDataChannel(rtc: RTCPeerConnection): Promise<RTCDataChannel> {
    return new Promise(resolve => {
      rtc.ondatachannel = e => {
        e.channel.binaryType = "arraybuffer";
        e.channel.addEventListener(
          "open",
          () => {
            console.log("DataChannel opened");
            resolve(e.channel);
          },
          { once: true },
        );
      };
    });
  }

  sendFiles(files: File[]) {
    for (const file of files) {
      for (const connection of this.connections.values()) {
        if (!connection.dataChannel) {
          throw new Error("dataChannelが無いReciver");
        }
        console.log("send file", file.name);
        this.sendFileInfo(file, connection.dataChannel);
        //await this.sendFileData(file, connection.dataChannel);
      }
    }
  }

  async sendFileData(file: File, dataChannel: RTCDataChannel) {
    // TODO: ファイルを分割して送信する
  }

  sendFileInfo(file: File, dataChannel: RTCDataChannel) {
    const fileInfo = {
      type: "fileInfo",
      message: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    };
    dataChannel.send(JSON.stringify(fileInfo));
  }
}
