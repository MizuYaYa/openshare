import { Dropzone } from "@yamada-ui/dropzone";
import { Center, FormatByte, Heading, Text } from "@yamada-ui/react";
import { useEffect, useState } from "react";

export default function Sender() {
  const [wsState, setWsState] = useState("");

  useEffect(() => {
    try {
      const ws = new WebSocket(import.meta.env.VITE_WS_API_URL);
      ws.addEventListener("open", () => {
        ws.send("Hello, WebSocket!");
        setWsState(ws.readyState.toString());
        console.log("Connection opened");
      });
      ws.addEventListener("message", event => {
        console.log(`Message from server: ${event.data}`);
      });
      ws.addEventListener("close", () => {
        console.log("Connection closed");
      });
      ws.addEventListener("error", error => {
        console.error("event WebSocket error:", error);
      });
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  }, []);

  const maxTransferSize = 1000 ** 3;
  const maxFiles = 5;

  return (
    <>
      <Center>
        <Dropzone multiple maxSize={maxTransferSize} maxFiles={5} mx="3xl" size="sm">
          <Text fontSize="xl">
            ドラッグ&ドロップかクリックしてファイルを追加
            <br />
            最大
            <FormatByte value={maxTransferSize} />
            <br />
            {maxFiles}ファイルまで
          </Text>
        </Dropzone>
      </Center>
      <Heading>WebSocket State: {wsState}</Heading>
    </>
  );
}
