import { RTCSession } from "@/utils/webRTC";
import { Dropzone } from "@yamada-ui/dropzone";
import { ArrowUpFromLineIcon, FileIcon } from "@yamada-ui/lucide";
import { Box, Button, Container, Flex, FormatByte, Heading, Rating, Text } from "@yamada-ui/react";
import type { ClientData, SenderMessage, ServerMessage } from "openshare";
import { useEffect, useRef, useState } from "react";
import { browserName, osName } from "react-device-detect";

import FileList from "@/components/FileList";
import Receivers from "@/components/Receivers";
import WSSignalingURL from "@/components/sender/WSSignalingURL";

export default function Sender() {
  const [wsState, setWsState] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [receivers, setReceivers] = useState<(ClientData & { id: string; isReady: boolean })[]>([]);
  const [connectURL, setConnectURL] = useState<string>("");
  const rtcS = useRef(new RTCSession());

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/host`);
    setWsState(ws.readyState);

    function openHandler() {
      // console.log("Connection opened");

      setWsState(ws.readyState);
      const c: SenderMessage = { type: "clientData", message: { os: osName, browser: browserName } };
      ws.send(JSON.stringify(c));
    }

    async function messageHandler(event: MessageEvent) {
      // console.log("Message from server: ", JSON.parse(event.data));
      const data: ServerMessage = JSON.parse(event.data);
      switch (data.type) {
        case "roomId":
          setConnectURL(`${location.href}connect/${data.message}`);
          break;

        case "connectionRequest": {
          const rtc = rtcS.current.newConnection(data.message);
          await rtc.setRemoteDescription(JSON.parse(data.message.sdp));
          const sdp = await rtc.createAnswer();
          await rtc.setLocalDescription(sdp);
          rtcS.current.setDataChannel(data.message.id, rtc);

          const { clientData, id } = data.message;

          async function connectionStateHandler() {
            // console.log("connectionState", rtc.connectionState);
            if (rtc.connectionState === "connected") {
              setReceivers(prev => [...prev, { ...clientData, id, isReady: true }]);
            }
          }

          function iceHandler(event: RTCPeerConnectionIceEvent) {
            if (event.candidate) {
              // console.log("onicecandidate", event.candidate);

              const c: SenderMessage = {
                type: "ice",
                message: { ice: JSON.stringify(event.candidate), id },
              };
              ws.send(JSON.stringify(c));
            }
          }
          rtc.addEventListener("connectionstatechange", connectionStateHandler, { signal });
          rtc.addEventListener("icecandidate", iceHandler, { signal });

          const c: SenderMessage = {
            type: "connectionResponse",
            message: { ok: true, sdp: JSON.stringify(sdp), receiverId: data.message.id },
          };
          ws.send(JSON.stringify(c));
          break;
        }

        case "ice": {
          if (!data.message?.id) {
            throw new Error("id is empty");
          }
          const rtc = rtcS.current.connections.get(data.message.id)?.connection;
          if (!rtc) {
            throw new Error("rtc is empty");
          }
          await rtc.addIceCandidate(JSON.parse(data.message.ice));
          break;
        }

        case "connectionState": {
          // console.log("connectionState", data.message);

          if (data.message.state === "disconnected") {
            setReceivers(prev => prev.filter(r => r.id !== data.message.id));
            rtcS.current.connections.get(data.message.id)?.connection.close();
            rtcS.current.connections.delete(data.message.id);
          }
          break;
        }

        case "turn": {
          rtcS.current.iceServer = data.message;
          break;
        }

        case "ping": {
          const c: SenderMessage = { type: "pong" };
          ws.send(JSON.stringify(c));
          break;
        }

        default:
          break;
      }
    }

    function closeHandler() {
      // console.log("Connection closed");
      setConnectURL("");
      setWsState(ws.readyState);
      for (const [_, { connection }] of rtcS.current.connections) {
        connection.close();
      }
    }

    function errorHandler(error: Event) {
      console.error("event WebSocket error:", error);
      setConnectURL("");
      setWsState(ws.readyState);
    }

    ws.addEventListener("open", openHandler, { signal });
    ws.addEventListener("message", messageHandler, { signal });
    ws.addEventListener("close", closeHandler, { signal });
    ws.addEventListener("error", errorHandler, { signal });

    function cleanUp() {
      controller.abort("Sender page unmounted");
      setConnectURL("");
      ws.close();
      setWsState(ws.readyState);
      for (const [_, { connection }] of rtcS.current.connections) {
        connection.close();
      }
    }
    return cleanUp;
  }, []);

  const maxTransferSize = 1000 ** 3;
  const maxFiles = 5;

  return (
    <Container>
      <Flex gap={{ base: "xl", md: "sm" }} wrap={{ base: "nowrap", md: "wrap" }}>
        <Dropzone
          multiple
          maxSize={maxTransferSize}
          maxFiles={5}
          onDrop={acceptedFiles => {
            // console.log("accepted files", acceptedFiles, "rejected files", fileRejections);

            const preNumOfFiles = files.length + acceptedFiles.length;
            const preSize = files.reduce((a, c) => a + c.size, 0) + acceptedFiles.reduce((a, c) => a + c.size, 0);
            if (preNumOfFiles <= maxFiles && preSize <= maxTransferSize) {
              // console.log(preNumOfFiles, preSize);
              setFiles(prev => [...prev, ...acceptedFiles]);
            } else {
              console.error("File size or number of files exceeded");
              //警告を出す
            }
          }}
          size={{ base: "md", md: "full" }}
          w="6xl"
          invalid={files.length === maxFiles}
          disabled={files.length === maxFiles}
        >
          <Text fontSize="xl">
            ドラッグ&ドロップかクリックしてファイルを追加
            <br />
            最大
            <FormatByte value={maxTransferSize} />
            <br />
            {maxFiles}ファイルまで
          </Text>
        </Dropzone>
        <Box minW={{ base: "lg", lg: "sm", md: "full" }} flexGrow={1}>
          <Heading fontSize="md" m="sm" display="flex" gap="sm" alignItems="center" whiteSpace="nowrap">
            <Rating
              readOnly
              items={maxFiles}
              value={files.length}
              emptyIcon={<FileIcon />}
              filledIcon={<FileIcon />}
              color={files.length === maxFiles ? "yellow.400" : "green.400"}
              aria-label={`${files.length} of ${maxFiles} files`}
            />{" "}
            <FormatByte value={files.reduce((a, c) => a + c.size, 0)} />
          </Heading>
          <FileList files={files} setFiles={setFiles} />
        </Box>
      </Flex>
      <Flex wrap={{ md: "wrap" }}>
        <WSSignalingURL connectURL={connectURL} wsState={wsState} />
        <Box p="md">
          <Flex gapX="md" mb="lg" alignItems="center" wrap={{ sm: "wrap" }}>
            <Heading fontSize="xl" p="xs" whiteSpace="nowrap">
              受信者
            </Heading>
            <Button
              size="sm"
              px="xl"
              disabled={files.length === 0 || receivers.length === 0 || !receivers.every(r => r.isReady)}
              onClick={() => {
                // console.log("clicked send file button");
                rtcS.current.sendFiles(files);
              }}
            >
              送信する
              <ArrowUpFromLineIcon />
            </Button>
          </Flex>
          <Receivers receivers={receivers} />
        </Box>
      </Flex>
    </Container>
  );
}
