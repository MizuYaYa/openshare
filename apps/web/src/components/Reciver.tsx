import { Flex } from "@yamada-ui/react";
import type { ReciverMessage, ServerMessage } from "openshare";
import { useEffect } from "react";
import { browserName, osName } from "react-device-detect";
import { useParams } from "react-router";

export default function Reciver() {
  const { roomId } = useParams();

  useEffect(() => {
    let ws: WebSocket;
    let rtc: RTCPeerConnection;
    (async () => {
      try {
        ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/connect/${roomId}`);

        rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
        if (!rtc) {
          throw new Error("rtc is empty");
        }
        const dataChannel = rtc.createDataChannel("dataChannel");
        if (!dataChannel) {
          throw new Error("dataChannel is empty");
        }

        dataChannel.binaryType = "arraybuffer";

        dataChannel.addEventListener("open", () => {
          console.log("DataChannel opened");
        });
        dataChannel.addEventListener("message", event => {
          console.log(`Message from sender: ${event.data}`);
        });
        const sdp = await rtc.createOffer();
        await rtc.setLocalDescription(sdp);
        ws.addEventListener("open", () => {
          console.log("Connection opened");
          if (!rtc.localDescription) {
            throw new Error("sdp is empty");
          }
          const c: ReciverMessage = {
            type: "connectionRequest",
            message: { sdp: JSON.stringify(rtc.localDescription), clientData: { os: osName, browser: browserName } },
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(c));
          }

          rtc.onicecandidate = event => {
            if (event.candidate) {
              console.log("onicecandidate", event.candidate);

              const c: ReciverMessage = { type: "ice", message: { ice: JSON.stringify(event.candidate) } };
              ws.send(JSON.stringify(c));
            }
          };
        });
        ws.addEventListener("message", async event => {
          console.log(`Message from server: ${event.data}`);

          const data: ServerMessage = JSON.parse(event.data);
          switch (data.type) {
            case "connectionResponse": {
              if (!data.message.ok) {
                rtc.close();
                throw new Error("connectionResponse is not ok");
              }
              console.log("set remote description");
              await rtc.setRemoteDescription(JSON.parse(data.message.sdp));

              break;
            }

            default:
              break;
          }
        });
        ws.addEventListener("close", () => {
          console.log("Connection closed");
          rtc.close();
        });
        ws.addEventListener("error", error => {
          console.error("event WebSocket error:", error);
        });
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    })();
    return () => {
      ws.addEventListener("open", () => {
        if (ws.readyState === ws.OPEN) {
          ws.close();
        }
        rtc.close();
      });
    };
  }, [roomId]);

  return (
    <>
      <Flex></Flex>
    </>
  );
}
