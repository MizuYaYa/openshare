import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  For,
  FormatByte,
  Progress,
} from "@yamada-ui/react";
import type { ReceiverMessage, ServerMessage } from "openshare";
import { useEffect, useRef, useState } from "react";
import { browserName, osName } from "react-device-detect";
import { useParams } from "react-router";

type ReceiveFile = {
  name: string;
  size: number;
  type: string;
  isPending: boolean;
};

type Files = {
  receiveSize: number;
  file: ArrayBuffer[];
} & ReceiveFile;

export default function Receiver() {
  const { roomId } = useParams();
  const [receiveFiles, setReceiveFiles] = useState<ReceiveFile[]>([]);
  const files = useRef(new Set<Files>());

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let ws: WebSocket;
    let rtc: RTCPeerConnection;
    try {
      ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/connect/${roomId}`);

      ws.addEventListener("open", async () => {
        console.log("Connection opened");

        rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
        if (!rtc) {
          throw new Error("rtc is empty");
        }
        const dataChannel = rtc.createDataChannel("dataChannel");
        if (!dataChannel) {
          throw new Error("dataChannel is empty");
        }

        rtc.addEventListener("connectionstatechange", () => {
          console.log("Connection state change", rtc?.connectionState);

          if (rtc?.connectionState === "closed") {
            rtc?.close();
          }
        }, { signal });

        dataChannel.binaryType = "arraybuffer";

        dataChannel.addEventListener("open", () => {
          console.log("DataChannel opened");
        }, { signal });
        dataChannel.addEventListener("message", event => {
          if (event.data instanceof ArrayBuffer) {
            const file = Array.from(files.current.values()).find(file => file.isPending);
            if (!file) {
              throw new Error("file is empty");
            }

            file.file.push(event.data);
            file.receiveSize += event.data.byteLength;

            // console.log(file);
            if (file.size === file.receiveSize) {
              file.isPending = false;
              setReceiveFiles(files =>
                files.map(rFile => (rFile.name === file.name ? { ...rFile, isPending: false } : rFile)),
              );
            }
            return;
          }

          const data = JSON.parse(event.data);
          if (data.type === "fileInfo") {
            console.log("fileInfo", data);
            const file = {
              name: data.message.name,
              size: data.message.size,
              type: data.message.type,
              isPending: true,
            };
            files.current.add({ ...file, receiveSize: 0, file: [] });
            setReceiveFiles(files => [...files, { ...file }]);
          }
        }, { signal });
        const sdp = await rtc.createOffer();
        await rtc.setLocalDescription(sdp);
        if (!rtc.localDescription) {
          throw new Error("sdp is empty");
        }
        const c: ReceiverMessage = {
          type: "connectionRequest",
          message: {
            sdp: JSON.stringify(rtc.localDescription),
            clientData: { os: osName, browser: browserName },
          },
        };
        ws.send(JSON.stringify(c));

        rtc.addEventListener("icecandidate", event => {
          if (event.candidate) {
            console.log("onicecandidate", event.candidate);

            const c: ReceiverMessage = { type: "ice", message: { ice: JSON.stringify(event.candidate) } };
            ws.send(JSON.stringify(c));
          }
        }, { signal });
      }, { signal });
      ws.addEventListener("message", async event => {
        console.log("Message from server: ", JSON.parse(event.data));

        const data: ServerMessage = JSON.parse(event.data);
        switch (data.type) {
          case "connectionResponse": {
            if (!data.message.ok) {
              rtc?.close();
              throw new Error("connectionResponse is not ok");
            }
            console.log("set remote description");
            await rtc?.setRemoteDescription(JSON.parse(data.message.sdp));

            break;
          }
          case "ice": {
            console.log("add ice candidate");
            await rtc?.addIceCandidate(JSON.parse(data.message.ice));

            break;
          }

          default:
            break;
        }
      }, { signal });
      ws.addEventListener("close", () => {
        console.log("Connection closed");
        rtc?.close();
      }, { signal });
      ws.addEventListener("error", error => {
        console.error("event WebSocket error:", error);
      }, { signal });
    } catch (error) {
      console.error("WebSocket error:", error);
    }
    return () => {
      controller.abort("Receiver page unmounted");
      ws.addEventListener("open", () => {
        ws.close();
        rtc?.close();
      }, { once: true });
    };
  }, [roomId]);

  return (
    <Container>
      <Flex gap="md" wrap="wrap">
        <For each={receiveFiles}>
          {(receiveFiles, i) => (
            <Card key={i}>
              <CardHeader>{receiveFiles.name}</CardHeader>
              <CardBody>
                <Progress hasStripe={receiveFiles.isPending} />
              </CardBody>
              <CardFooter>
                <FormatByte value={receiveFiles.size} />
                <Button
                  disabled={receiveFiles.isPending}
                  onClick={() => {
                    const file = Array.from(files.current.values()).find(file => file.name === receiveFiles.name);
                    const blob = new Blob(file?.file, { type: receiveFiles.type });
                    const src = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = src;
                    a.download = receiveFiles.name;
                    a.click();
                    URL.revokeObjectURL(src);
                  }}
                  size="xs"
                >
                  保存
                </Button>
              </CardFooter>
            </Card>
          )}
        </For>
      </Flex>
    </Container>
  );
}
