import { BadgeXIcon, TriangleAlertIcon } from "@yamada-ui/lucide";
import { Box, Heading, Loading, Tag, VStack } from "@yamada-ui/react";
import type { ClientData } from "openshare";
import { useEffect, useState } from "react";

import { type GetState, statusProperties } from "@/utils/ui";

export type SenderStatus = {
  isOk?: boolean;
  isError?: string;
  clientData?: ClientData;
  rtcState?: RTCPeerConnectionState;
};

export type ConnectionStateProps = {
  wsState: number;
  senderStatus?: SenderStatus;
};

const rtcMap = {
  new: -1,
  connecting: 0,
  connected: 1,
  disconnected: 3,
  failed: 4,
  closed: 3,
};

export default function ConnectionState({ wsState, senderStatus }: ConnectionStateProps) {
  const [wsConnectionState, setWsConnectionState] = useState<GetState>(statusProperties.getState(wsState));
  const [rtcConnectionState, setRtcConnectionState] = useState<GetState>({
    title: "未接続",
    bgColor: "gray.50",
    color: "gray.800",
    icon: <TriangleAlertIcon />,
  });

  useEffect(() => {
    const status = statusProperties.getState(wsState);
    setWsConnectionState(status);
  }, [wsState]);

  useEffect(() => {
    switch (senderStatus?.rtcState) {
      case "new":
        setRtcConnectionState({
          title: "接続開始中",
          bgColor: "gray.50",
          color: "gray.800",
          icon: <Loading />,
        });
        break;
      case "failed":
        setRtcConnectionState({
          title: "接続不可",
          bgColor: "purple.50",
          color: "purple.800",
          icon: <BadgeXIcon />,
        });
        break;

      default:
        if (senderStatus?.rtcState) {
          const status = statusProperties.getState(rtcMap[senderStatus.rtcState]);
          setRtcConnectionState(status);
        } else {
          setRtcConnectionState({
            title: "未接続",
            bgColor: "gray.50",
            color: "gray.800",
            icon: <TriangleAlertIcon />,
          });
        }
        break;
    }
  }, [senderStatus?.rtcState]);

  return (
    <Box>
      <Heading>通信状態</Heading>
      <VStack>
        <Box>
          <Heading size="sm">サーバー</Heading>
          <Tag
            startIcon={wsConnectionState.icon}
            size="sm"
            color={wsConnectionState.color}
            bg={wsConnectionState.bgColor}
          >
            {wsConnectionState.title}
          </Tag>
        </Box>
        <Box>
          <Heading size="sm">送信者</Heading>
          <Tag
            startIcon={rtcConnectionState.icon}
            size="sm"
            color={rtcConnectionState.color}
            bg={rtcConnectionState.bgColor}
          >
            {rtcConnectionState.title}
          </Tag>
        </Box>
      </VStack>
    </Box>
  );
}
