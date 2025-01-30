import { Flex } from "@yamada-ui/react";
import type { ReciverMessage } from "openshare";
import { useEffect } from "react";
import { browserName, osName } from "react-device-detect";
import { useParams } from "react-router";

export default function Reciver() {
  const { roomId } = useParams();

  useEffect(() => {
    (async () => {
      try {
        const ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/connect/${roomId}`);
        const rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
        const sdp = await rtc.createOffer();
        rtc.setLocalDescription(new RTCSessionDescription(sdp));
        ws.addEventListener("open", () => {
          console.log("Connection opened");
          if (!rtc.localDescription) {
            throw new Error("sdp is empty");
          }
          const c: ReciverMessage = {
            type: "connectionRequest",
            message: { sdp: JSON.stringify(rtc.localDescription), clientData: { os: osName, browser: browserName } },
          };
          ws.send(JSON.stringify(c));
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
    })();
  }, [roomId]);

  return (
    <>
      <Flex></Flex>
    </>
  );
}
