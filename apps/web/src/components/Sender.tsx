import { RTCSession } from "@/utils/webRTC";
import { Dropzone } from "@yamada-ui/dropzone";
import { GhostIcon } from "@yamada-ui/lucide";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Fieldset,
  Flex,
  For,
  FormatByte,
  Heading,
  Indicator,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Tag,
  Text,
  Wrap,
  useClipboard,
} from "@yamada-ui/react";
import type { ClientData, SenderMessage, ServerMessage } from "openshare";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { browserName, osName } from "react-device-detect";

export default function Sender() {
  const [wsState, setWsState] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [roomId, setRoomId] = useState<undefined | string>();
  const { onCopy, hasCopied } = useClipboard();
  const [recivers, setRecivers] = useState<(ClientData & { id: string })[]>([]);
  const rtcS = useRef(new RTCSession());
  const serverStatus = ["接続試行中", "通信中", "切断中", "切断"];

  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/host`);

      ws.addEventListener("open", () => {
        console.log("Connection opened");

        setWsState(ws.readyState);
        const c: SenderMessage = { type: "clientData", message: { os: osName, browser: browserName } };
        ws.send(JSON.stringify(c));
      });
      ws.addEventListener("message", async event => {
        console.log("Message from server: ", JSON.parse(event.data));
        const data: ServerMessage = JSON.parse(event.data);
        switch (data.type) {
          case "roomId":
            setRoomId(data.message);
            break;

          case "connectionRequest": {
            const rtc = rtcS.current.newConnection(data.message);
            await rtc.setRemoteDescription(JSON.parse(data.message.sdp));
            const sdp = await rtc.createAnswer();
            await rtc.setLocalDescription(sdp);

            rtc.addEventListener("connectionstatechange", () => {
              console.log("connectionState", rtc.connectionState);
              if (rtc.connectionState === "connected") {
                rtcS.current.setDataChannel(data.message.id, rtc);
              }
            });

            setRecivers(prev => [...prev, { ...data.message.clientData, id: data.message.id }]);

            const c: SenderMessage = {
              type: "connectionResponse",
              message: { ok: true, sdp: JSON.stringify(sdp), reciverId: data.message.id },
            };
            ws.send(JSON.stringify(c));
            break;
          }

          case "ice": {
            const rtc = rtcS.current.connections.get(data.message.id)?.connection;
            if (!rtc) {
              throw new Error("rtc is empty");
            }
            await rtc.addIceCandidate(JSON.parse(data.message.ice));
            break;
          }

          case "connectionState": {
            console.log("connectionState", data.message);

            if (data.message.state === "disconnected") {
              setRecivers(prev => prev.filter(r => r.id !== data.message.id));
              rtcS.current.connections.get(data.message.id)?.connection.close();
              rtcS.current.connections.delete(data.message.id);
            }
            break;
          }

          default:
            break;
        }
      });
      ws.addEventListener("close", () => {
        console.log("Connection closed");
        for (const [_, { connection }] of rtcS.current.connections) {
          connection.close();
        }
      });
      ws.addEventListener("error", error => {
        console.error("event WebSocket error:", error);
      });
    } catch (error) {
      console.error("WebSocket error:", error);
    }
    return () => {
      ws.addEventListener("open", () => {
        if (ws.readyState === ws.OPEN) {
          ws.close();
        }
        for (const [_, { connection }] of rtcS.current.connections) {
          connection.close();
        }
      });
    };
  }, []);

  const maxTransferSize = 1000 ** 3;
  const maxFiles = 5;

  return (
    <>
      <Flex mx="xl" gap="xl">
        <Dropzone
          multiple
          maxSize={maxTransferSize}
          maxFiles={5}
          onDrop={(acceptedFiles, fileRejections) => {
            console.log("accepted files", acceptedFiles, "rejected files", fileRejections);

            const preNumOfFiles = files.length + acceptedFiles.length;
            const preSize = files.reduce((a, c) => a + c.size, 0) + acceptedFiles.reduce((a, c) => a + c.size, 0);
            if (preNumOfFiles <= maxFiles && preSize <= maxTransferSize) {
              console.log(preNumOfFiles, preSize);
              setFiles(prev => [...prev, ...acceptedFiles]);
            } else {
              console.error("File size or number of files exceeded");
              //警告を出す
            }
          }}
          size="sm"
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
        <Box>
          <Heading fontSize="sm">送信ファイル</Heading>
          <Stack>
            <For each={files} fallback={<Center>ファイルがありません</Center>}>
              {(file, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Heading fontSize="sm">{file.name}</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text>{}</Text>
                    <FormatByte value={file.size} />
                  </CardBody>
                  <CardFooter>{}</CardFooter>
                </Card>
              )}
            </For>
          </Stack>
        </Box>
      </Flex>
      <Flex m="xl">
        <Box>
          <Fieldset
            legend="共有URL"
            helperMessage="受信者にURLを共有します"
            optionalIndicator={
              <Tag size="sm" ms="sm">
                {serverStatus[wsState]}
              </Tag>
            }
          >
            <InputGroup size="md">
              <Input value={roomId ? `${location.href}connect/${roomId}` : ""} readOnly htmlSize={75} name="roomId" />
              <InputRightElement w="5xs" clickable>
                <Button
                  onClick={() => onCopy(`${location.href}connect/${roomId}`)}
                  h="1.75rem"
                  size="sm"
                  disabled={!roomId}
                >
                  {hasCopied ? "Copied!" : "Copy"}
                </Button>
              </InputRightElement>
            </InputGroup>
          </Fieldset>
          {roomId ? <QRCodeSVG value={`${location.href}connect/${roomId}`} /> : null}
        </Box>
        <Box p="md">
          <Flex gap="md" mb="lg">
            <Heading fontSize="xl">受信者</Heading>
          </Flex>
          <Wrap gap="xl">
            <For each={recivers} fallback={<Center>受信者がいません</Center>}>
              {reciver => (
                <Indicator key={reciver.id} label="通信中" pingScale={2}>
                  <Card>
                    <CardHeader>
                      <Avatar icon={<GhostIcon />} />
                    </CardHeader>
                    <CardBody>
                      <Text>{reciver.os}</Text>
                      <Text>{reciver.browser}</Text>
                    </CardBody>
                  </Card>
                </Indicator>
              )}
            </For>
          </Wrap>
        </Box>
      </Flex>
    </>
  );
}
