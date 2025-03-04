import type { ClientData, ConnectionRequestWithId } from "openshare";
import type { Dispatch, SetStateAction } from "react";

import type { QueuedFile, Receiver } from "@/pages/Sender";

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
    return new Promise((resolve) => {
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

  async sendFiles(
    files: QueuedFile[],
    setFiles: Dispatch<SetStateAction<QueuedFile[]>>,
    setReceivers: Dispatch<SetStateAction<Receiver[]>>,
  ) {
    for (const file of files) {
      setFiles((prev) =>
        prev.map((queuedFile) => {
          if (queuedFile.file === file.file) {
            return { ...queuedFile, start: new Date(), end: undefined };
          }
          return queuedFile;
        }),
      );
      setReceivers((prev) =>
        prev.map((receiver) => {
          const fileName = file.file.name;
          if (receiver.filesSendState[fileName]) {
            receiver.filesSendState[fileName].sentByte = 0;
          } else {
            receiver.filesSendState[fileName] = { sentByte: 0, sendStatus: "Pending" };
          }
          return receiver;
        }),
      );
      for await (const [id, connection] of this.connections) {
        if (!connection.dataChannel) {
          throw new Error("dataChannelが無いReceiver");
        }
        // console.log("send file", file.name);

        this.sendFileInfo(file.file, connection.dataChannel);
        await this.sendFileDataP(file, connection.dataChannel, id, setReceivers);
      }
      setFiles((prev) =>
        prev.map((queueFile) => {
          if (queueFile.file === file.file) {
            return { ...queueFile, end: new Date() };
          }
          return queueFile;
        }),
      );
    }
  }

  async sendFileDataP(
    file: QueuedFile,
    dataChannel: RTCDataChannel,
    id: string,
    setReceivers: Dispatch<SetStateAction<Receiver[]>>,
  ) {
    return new Promise<void>((resolve) => {
      this.sendFileData(file, dataChannel, id, setReceivers, resolve);
    });
  }

  async sendFileData(
    file: QueuedFile,
    dataChannel: RTCDataChannel,
    id: string,
    setReceivers: Dispatch<SetStateAction<Receiver[]>>,
    resolve: (value: void | PromiseLike<void>) => void,
  ) {
    let offset = 0;
    // console.log("send file data", file);

    function updateProgress() {
      setReceivers((prev) =>
        prev.map((receiver) => {
          if (receiver.id === id) {
            const fileName = file.file.name;
            if (!receiver.filesSendState[fileName] || receiver.filesSendState[fileName].sendStatus !== "Sending") {
              receiver.filesSendState[fileName] = { sentByte: 0, sendStatus: "Sending" };
            }
            receiver.filesSendState[fileName].sentByte = offset;
          }
          return receiver;
        }),
      );
    }

    const buffer = await file.file.arrayBuffer();
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
        if (offset % (this.maxChunkSize * 10) === 0) {
          updateProgress();
        }
      }
      updateProgress();
      setReceivers((prev) =>
        prev.map((receiver) => {
          if (receiver.id === id) {
            const fileName = file.file.name;
            if (!receiver.filesSendState[fileName]) {
              throw new Error("sendStateがある必要があるはずなんだけど...");
            }
            receiver.filesSendState[fileName].sendStatus = "Done";
          }
          return receiver;
        }),
      );
      resolve();
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
