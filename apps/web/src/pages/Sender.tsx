import Receivers from "@/components/Receivers";
import { RTCSession } from "@/utils/webRTC";
import { Dropzone } from "@yamada-ui/dropzone";
import { ArrowUpFromLineIcon, ClipboardCheckIcon, CopyIcon, FileIcon, FilesIcon, TrashIcon } from "@yamada-ui/lucide";

import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Container,
  Fieldset,
  Flex,
  For,
  FormatByte,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalFooter,
  Rating,
  ScrollArea,
  Spacer,
  Stack,
  Tag,
  Text,
  Tooltip,
  useBreakpoint,
  useClipboard,
  useDisclosure,
  useNotice,
} from "@yamada-ui/react";
import type { ClientData, SenderMessage, ServerMessage } from "openshare";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { browserName, osName } from "react-device-detect";

export default function Sender() {
  const [wsState, setWsState] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [receivers, setReceivers] = useState<(ClientData & { id: string; isReady: boolean })[]>([]);
  const [connectURL, setConnectURL] = useState<string>("");
  const { onCopy, hasCopied } = useClipboard();
  const { open, onOpen, onClose } = useDisclosure();
  const breakpoint = useBreakpoint();
  const notice = useNotice();
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
            setConnectURL(`${location.href}connect/${data.message}`);
            break;

          case "connectionRequest": {
            const rtc = rtcS.current.newConnection(data.message);
            await rtc.setRemoteDescription(JSON.parse(data.message.sdp));
            const sdp = await rtc.createAnswer();
            await rtc.setLocalDescription(sdp);

            rtc.addEventListener("connectionstatechange", async () => {
              console.log("connectionState", rtc.connectionState);
              if (rtc.connectionState === "connected") {
                await rtcS.current.setDataChannel(data.message.id, rtc);
                setReceivers(prev => [...prev, { ...data.message.clientData, id: data.message.id, isReady: true }]);
              }
            });

            rtc.addEventListener("icecandidate", event => {
              if (event.candidate) {
                console.log("onicecandidate", event.candidate);

                const c: SenderMessage = {
                  type: "ice",
                  message: { ice: JSON.stringify(event.candidate), id: data.message.id },
                };
                ws.send(JSON.stringify(c));
              }
            });

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
            console.log("connectionState", data.message);

            if (data.message.state === "disconnected") {
              setReceivers(prev => prev.filter(r => r.id !== data.message.id));
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
        setConnectURL("");

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
          ws.close();
        for (const [_, { connection }] of rtcS.current.connections) {
          connection.close();
        } 
      });
    };
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
          <ScrollArea
            type="always"
            innerProps={{ as: Stack }}
            maxH="sm"
            p="sm"
            borderRadius="md"
            shadow="inner"
            overflowX="hidden"
          >
            <For each={files} fallback={<Center>ファイルがありません</Center>}>
              {(file, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Tooltip label={file.name} placement="top" fontSize="xs">
                      <Heading fontSize="sm" overflow="hidden" textOverflow="ellipsis" lineClamp={2}>
                        {file.name}
                      </Heading>
                    </Tooltip>
                  </CardHeader>
                  <CardBody>
                    <Text>{}</Text>
                  </CardBody>
                  <CardFooter>
                    <FormatByte value={file.size} />
                    <Spacer />
                    <IconButton
                      icon={<TrashIcon />}
                      onClick={() => {
                        setFiles(prev => prev.filter(f => f !== file));
                      }}
                    />
                  </CardFooter>
                </Card>
              )}
            </For>
          </ScrollArea>
        </Box>
      </Flex>
      <Flex wrap={{ md: "wrap" }}>
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
              <Input value={connectURL} readOnly htmlSize={75} name="roomId" pr="20" />
              <InputRightElement clickable>
                <IconButton
                  icon={hasCopied ? <ClipboardCheckIcon /> : <CopyIcon />}
                  onClick={() => {
                    onCopy(connectURL);

                    if (breakpoint !== "sm" && breakpoint !== "md") {
                      notice({
                        duration: 1500,
                        title: "Copied",
                        description: connectURL,
                        status: "success",
                        isClosable: true,
                        placement: "bottom-left",
                      });
                    }
                  }}
                  size="sm"
                  variant="ghost"
                  color={hasCopied ? "green" : undefined}
                  disabled={!connectURL}
                />
              </InputRightElement>
            </InputGroup>
          </Fieldset>
          <Box display="inline-flex" p="md" onClick={onOpen} cursor="pointer">
            {connectURL ? <QRCodeSVG value={connectURL} /> : null}
            <Modal open={open} onClose={onClose} size="2xl" bgColor="#FFF">
              <ModalBody overflow="hidden">
                {connectURL ? <QRCodeSVG value={connectURL} size={512} width="100%" marginSize={4} /> : null}
              </ModalBody>
              <ModalFooter>
                <Text fontSize="2xs">{connectURL}</Text>
              </ModalFooter>
            </Modal>
          </Box>
        </Box>
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
                console.log("clicked send file button");
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
