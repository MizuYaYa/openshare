import { TriangleAlertIcon } from "@yamada-ui/lucide";
import {
  Box,
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
  Text,
} from "@yamada-ui/react";
import type { ReceiverMessage, ServerMessage } from "openshare";
import { useEffect, useRef, useState } from "react";
import { browserName, osName } from "react-device-detect";
import { useParams } from "react-router";
import { decodeTime } from "ulid";

import AutoTimeUnit from "@/components/AutoTimeUnit";
import ConnectionState, { type SenderStatus } from "@/components/receiver/ConnectionState";
import { getReceiveFileHandle } from "@/utils/opfs";

type ReceiveFile = {
  name: string;
  size: number;
  type: string;
  isPending: boolean;
  receiveSize: number;
  start?: Date;
  end?: Date;
};

type Files = {
  receiveSize: number;
  file: ArrayBuffer[];
  opfs: false;
} & ReceiveFile;

type FilesForOpfsBrowser = {
  receiveSize: number;
  writableFileStream: FileSystemWritableFileStream;
  opfs: true;
} & ReceiveFile;

//@ts-ignore
const opfsBrowser = typeof showSaveFilePicker === "function";

export default function Receiver() {
  const { roomId } = useParams();
  const [receiveFiles, setReceiveFiles] = useState<ReceiveFile[]>([]);
  const [wsState, setWsState] = useState(0);
  const [senderStatus, setSenderStatus] = useState<SenderStatus>();
  const files = useRef(new Set<FilesForOpfsBrowser | Files>());

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/connect/${roomId}`);
    let rtc: RTCPeerConnection;

    setWsState(ws.readyState);

    async function openHandler() {
      // console.log("Connection opened");

      setWsState(ws.readyState);
      rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
      if (!rtc) {
        throw new Error("rtc is empty");
      }
      const dataChannel = rtc.createDataChannel("dataChannel");
      if (!dataChannel) {
        throw new Error("dataChannel is empty");
      }

      dataChannel.binaryType = "arraybuffer";

      function connectionStateHandler() {
        // console.log("Connection state change", rtc?.connectionState);

        setSenderStatus((prev) => ({ ...prev, rtcState: rtc?.connectionState }));
        if (rtc?.connectionState === "closed") {
          rtc?.close();
        }
      }

      function dataChannelOpenHandler() {
        // console.log("DataChannel opened");
      }

      async function dataChannelMessageHandler(event: MessageEvent) {
        if (event.data instanceof ArrayBuffer) {
          const file = Array.from(files.current.values()).find((file) => file.isPending);
          if (!file) {
            throw new Error("file is empty");
          }

          if (file.opfs) {
            await file.writableFileStream.write(event.data);
          } else {
            file.file.push(event.data);
          }
          file.receiveSize += event.data.byteLength;

          if (file.receiveSize % (Math.floor(file.size / event.data.byteLength / 100) * event.data.byteLength) === 0) {
            setReceiveFiles((prev) =>
              prev.map((receiveFile) => {
                if (receiveFile.isPending) {
                  receiveFile.receiveSize = file.receiveSize;
                }
                return receiveFile;
              }),
            );
          }

          // console.log(file);
          if (file.size === file.receiveSize) {
            file.isPending = false;
            if (file.opfs) {
              await file.writableFileStream.close();
            }
            setReceiveFiles((files) =>
              files.map((rFile) =>
                rFile.name === file.name
                  ? { ...rFile, isPending: false, end: new Date(), receiveSize: file.receiveSize }
                  : rFile,
              ),
            );
          }
          return;
        }

        const data = JSON.parse(event.data);
        if (data.type === "fileInfo") {
          // console.log("fileInfo", data);
          const file = {
            name: data.message.name,
            size: data.message.size,
            type: data.message.type,
            isPending: true,
            receiveSize: 0,
          };
          if (opfsBrowser) {
            const fileHandle = await getReceiveFileHandle(file.name, { create: true });
            files.current.add({ ...file, writableFileStream: await fileHandle.createWritable(), opfs: true });
          } else {
            files.current.add({ ...file, file: [], opfs: false });
          }
          setReceiveFiles((files) => [...files, { ...file, start: new Date() }]);
        }
      }

      function iceHandler(event: RTCPeerConnectionIceEvent) {
        if (event.candidate) {
          // console.log("onicecandidate", event.candidate);

          const c: ReceiverMessage = { type: "ice", message: { ice: JSON.stringify(event.candidate) } };
          ws.send(JSON.stringify(c));
        }
      }

      rtc.addEventListener("connectionstatechange", connectionStateHandler, { signal });
      dataChannel.addEventListener("open", dataChannelOpenHandler, { signal });
      dataChannel.addEventListener("message", dataChannelMessageHandler, { signal });
      rtc.addEventListener("icecandidate", iceHandler, { signal });

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
    }

    async function messageHandler(event: MessageEvent) {
      // console.log("Message from server: ", JSON.parse(event.data));

      const data: ServerMessage = JSON.parse(event.data);
      switch (data.type) {
        case "connectionResponse": {
          if (!data.message.ok) {
            rtc?.close();
            setSenderStatus((prev) => ({ rtcState: prev?.rtcState, isOk: false }));
            throw new Error("connectionResponse is not ok");
          }
          // console.log("set remote description");
          await rtc?.setRemoteDescription(JSON.parse(data.message.sdp));

          const responseData = { clientData: data.message.clientData, isOk: true };
          setSenderStatus((prev) => ({ ...prev, ...responseData }));
          break;
        }

        case "ice": {
          // console.log("add ice candidate");
          await rtc?.addIceCandidate(JSON.parse(data.message.ice));
          break;
        }

        case "connectionState": {
          if (data.message.state === "disconnected") {
            rtc?.close();
            setSenderStatus((prev) => ({ rtcState: prev?.rtcState, isOk: false, isError: "disconnected" }));
          }
          break;
        }

        case "error": {
          console.error("error", data.message);
          setSenderStatus({ isOk: false, isError: data.message });

          if (data.message === "INVALID_ROOM_ID") {
            ws.close();
          }
          break;
        }

        case "ping": {
          const c: ReceiverMessage = { type: "pong" };
          ws.send(JSON.stringify(c));
          break;
        }

        default:
          break;
      }
    }

    function closeHandler() {
      // console.log("Connection closed");
      setWsState(ws.readyState);
      rtc?.close();
    }

    function errorHandler(error: Event) {
      console.error("event WebSocket error:", error);
      setWsState(ws.readyState);
    }

    ws.addEventListener("open", openHandler, { signal });
    ws.addEventListener("message", messageHandler, { signal });
    ws.addEventListener("close", closeHandler, { signal });
    ws.addEventListener("error", errorHandler, { signal });

    function cleanUp() {
      controller.abort("Receiver page unmounted");
      ws.close();
      setWsState(ws.readyState);
      rtc?.close();
    }
    return cleanUp;
  }, [roomId]);

  const validateIdFormat = (id?: string) => {
    if (!id) {
      return null;
    }
    try {
      const decoded = decodeTime(id);
      if (decoded < 0 || decoded > Date.now()) {
        return false;
      }
    } catch {
      return null;
    }
    return true;
  };

  const ErrorFrame = () => {
    if (senderStatus?.isOk || !roomId) {
      return null;
    }
    if (senderStatus?.isError === "INVALID_ROOM_ID") {
      return (
        <Flex
          flexDir="column"
          pos="fixed"
          top="25%"
          left="50%"
          transform="translateX(-50%)"
          bgColor="white"
          borderRadius="md"
          p="lg"
          boxShadow="md"
        >
          <TriangleAlertIcon fontSize="6xl" color="red.400" />
          <Text>無効なルームIDです</Text>
          <Text color="gray.300">{roomId}</Text>
          <Text color="gray.300">
            {validateIdFormat(roomId)
              ? `${Math.trunc((Date.now() - decodeTime(roomId)) / 60000)}分前に作成された部屋はもう消えました・・・`
              : "形式が無効なルームIDです"}
          </Text>
        </Flex>
      );
    }
    return null;
  };

  return (
    <>
      <ErrorFrame />
      <Container>
        <ConnectionState wsState={wsState} senderStatus={senderStatus} />
        <Flex gap="md" wrap="wrap">
          <For each={receiveFiles} fallback={<Box>ファイルがありません</Box>}>
            {(receiveFiles, i) => {
              const sentPercentage = Number(((receiveFiles.receiveSize / receiveFiles.size) * 100).toFixed(0));
              return (
                <Card key={i}>
                  <CardHeader>{receiveFiles.name}</CardHeader>
                  <CardBody>
                    <Box w="full">
                      <Flex fontSize="sm" justifyContent="space-between">
                        <Text> {sentPercentage}%</Text>
                        {receiveFiles.start && receiveFiles.end ? (
                          <AutoTimeUnit
                            millisecond={receiveFiles.end.getTime() - receiveFiles.start.getTime()}
                            maximumFractionDigits={1}
                          />
                        ) : (
                          "???"
                        )}
                      </Flex>
                      <Progress value={sentPercentage} rounded="sm" />
                    </Box>
                  </CardBody>
                  <CardFooter>
                    <FormatByte value={receiveFiles.size} />
                    <Button
                      disabled={receiveFiles.isPending}
                      onClick={async () => {
                        const file = Array.from(files.current.values()).find((file) => file.name === receiveFiles.name);
                        if (file?.opfs) {
                          const accept = {
                            [receiveFiles.type]: [receiveFiles.name.slice(receiveFiles.name.lastIndexOf("."))],
                          };

                          //@ts-ignore: experimental https://developer.mozilla.org/docs/Web/API/Window/showSaveFilePicker
                          const osFileHandle: FileSystemFileHandle = await showSaveFilePicker({
                            suggestedName: receiveFiles.name,
                            types: [{ accept }],
                          });
                          const fileHandle = await getReceiveFileHandle(file.name);
                          await (await fileHandle.getFile()).stream().pipeTo(await osFileHandle.createWritable());
                        } else {
                          const blob = new Blob(file?.file, { type: receiveFiles.type });
                          const src = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = src;
                          a.download = receiveFiles.name;
                          a.click();
                          URL.revokeObjectURL(src);
                        }
                      }}
                      size="xs"
                    >
                      保存
                    </Button>
                  </CardFooter>
                </Card>
              );
            }}
          </For>
        </Flex>
      </Container>
    </>
  );
}
