import type { ClientData, ConnectionRequestWithId } from "openshare";

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
            console.log(`DataChannel ${e.channel.label} is opened`);
            resolve(e.channel);
          },
          { once: true },
        );
      };
    });
  }

  async sendFiles(files: File[]) {
    for (const file of files) {
      for await (const connection of this.connections.values()) {
        if (!connection.dataChannel) {
          throw new Error("dataChannelが無いReceiver");
        }
        console.log("send file", file.name);
        this.sendFileInfo(file, connection.dataChannel);
        await this.sendFileData(file, connection.dataChannel);
      }
    }
  }

  async sendFileData(file: File, dataChannel: RTCDataChannel) {
    let offset = 0;
    console.log("send file data", file);

    const buffer = await file.arrayBuffer();
    const send = () => {
      while (offset < buffer.byteLength) {
        if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
          console.log("bufferedAmount", dataChannel.bufferedAmount);
          if (!dataChannel.onbufferedamountlow) {
            dataChannel.onbufferedamountlow = () => {
              dataChannel.onbufferedamountlow = null;
              send();
            };
          }
          return;
        }
        const chunk = buffer.slice(offset, offset + this.maxChunkSize);
        offset += chunk.byteLength;
        dataChannel.send(chunk);
      }
    };
    send();
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
