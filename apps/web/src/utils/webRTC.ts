import type { ClientData, ConnectionRequestWithId } from "openshare";

export class RTCSession {
  connections: Map<string, { clientData: ClientData; connection: RTCPeerConnection; dataChannel?: RTCDataChannel }>;
  maxChunkSize: number;
  iceServer: RTCIceServer;
  constructor() {
    this.connections = new Map();
    this.maxChunkSize = 16 * 1024;
    this.iceServer = { urls: "stun:stun.cloudflare.com:3478" };
  }

  newConnection(connectionData: ConnectionRequestWithId) {
    const rtc = new RTCPeerConnection({ iceServers: [this.iceServer] });

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
      // console.log("DataChannel created");
    } else {
      throw new Error(`${id} connection not found`);
    }
  }

  private _rtcDataChannel(rtc: RTCPeerConnection): Promise<RTCDataChannel> {
    return new Promise(resolve => {
      function dataChannelHandler(e: RTCDataChannelEvent) {
        e.channel.binaryType = "arraybuffer";

        function channelOpenHandler() {
          // console.log(`DataChannel ${e.channel.label} is opened`);
          resolve(e.channel);
        }
        e.channel.addEventListener("open", channelOpenHandler, { once: true });
      }
      rtc.addEventListener("datachannel", dataChannelHandler, { once: true });
    });
  }

  async sendFiles(files: File[]) {
    for (const file of files) {
      for await (const connection of this.connections.values()) {
        if (!connection.dataChannel) {
          throw new Error("dataChannelが無いReceiver");
        }
        // console.log("send file", file.name);
        this.sendFileInfo(file, connection.dataChannel);
        await this.sendFileData(file, connection.dataChannel);
      }
    }
  }

  async sendFileData(file: File, dataChannel: RTCDataChannel) {
    let offset = 0;
    // console.log("send file data", file);

    const buffer = await file.arrayBuffer();
    const send = () => {
      while (offset < buffer.byteLength) {
        if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
          // console.log("bufferedAmount", dataChannel.bufferedAmount);
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
