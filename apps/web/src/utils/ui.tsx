import { CheckIcon, TriangleAlertIcon, XIcon } from "@yamada-ui/lucide";
import { Loading } from "@yamada-ui/react";
import type React from "react";

export type GetState = {
  title: string;
  bgColor: string;
  color: string;
  icon: React.JSX.Element;
};

export const statusProperties = {
  title: ["接続試行中", "通信中", "切断中", "切断"],
  bgColor: ["gray.50", "primary.50", "orange.50", "red.50"],
  color: ["gray.800", "primary.800", "orange.800", "red.800"],
  icon: {
    0: <Loading />,
    1: <CheckIcon />,
    2: <TriangleAlertIcon />,
    3: <XIcon />,
  } as { [key: number]: React.JSX.Element },
  getState(state: number): GetState {
    return {
      title: this.title[state],
      bgColor: this.bgColor[state],
      color: this.color[state],
      icon: this.icon[state],
    };
  },
};
