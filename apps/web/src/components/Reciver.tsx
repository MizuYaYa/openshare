import { Flex } from "@yamada-ui/react";
import type { ReciverMessage, ServerMessage } from "openshare";
import { useEffect, useRef, useState } from "react";
import { browserName, osName } from "react-device-detect";
import { useParams } from "react-router";

export default function Reciver() {
  const { roomId } = useParams();
  const rtc = useRef<RTCPeerConnection>();

  useEffect(() => {
    let ws: WebSocket;
    (async () => {
      try {
        ws = new WebSocket(`${import.meta.env.VITE_WS_API_URL}/connect/${roomId}`);

        ws.addEventListener("open", async () => {
          console.log("Connection opened");

          rtc.current = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
          if (!rtc) {
            throw new Error("rtc is empty");
          }
          const dataChannel = rtc.current.createDataChannel("dataChannel");
          if (!dataChannel) {
            throw new Error("dataChannel is empty");
          }

          dataChannel.binaryType = "arraybuffer";

          dataChannel.addEventListener("open", () => {
            console.log("DataChannel opened");
          });
          dataChannel.addEventListener("message", event => {
            console.log("Message from sender: ", event.data);
          });
          const sdp = await rtc.current.createOffer();
          await rtc.current.setLocalDescription(sdp);
          if (!rtc.current.localDescription) {
            throw new Error("sdp is empty");
          }
          const c: ReciverMessage = {
            type: "connectionRequest",
            message: {
              sdp: JSON.stringify(rtc.current.localDescription),
              clientData: { os: osName, browser: browserName },
            },
          };
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(c));
          }

          rtc.current.onicecandidate = event => {
            if (event.candidate) {
              console.log("onicecandidate", event.candidate);

              const c: ReciverMessage = { type: "ice", message: { ice: JSON.stringify(event.candidate) } };
              ws.send(JSON.stringify(c));
            }
          };
        });
        ws.addEventListener("message", async event => {
          console.log("Message from server: ", JSON.parse(event.data));

          const data: ServerMessage = JSON.parse(event.data);
          switch (data.type) {
            case "connectionResponse": {
              if (!data.message.ok) {
                rtc.current?.close();
                throw new Error("connectionResponse is not ok");
              }
              console.log("set remote description");
              await rtc.current?.setRemoteDescription(JSON.parse(data.message.sdp));

              break;
            }

            default:
              break;
          }
        });
        ws.addEventListener("close", () => {
          console.log("Connection closed");
          rtc.current?.close();
          rtc.current = undefined;
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
        rtc.current?.close();
      });
    };
  }, [roomId]);

  return (
    <>
      <Flex></Flex>
    </>
  );
}
