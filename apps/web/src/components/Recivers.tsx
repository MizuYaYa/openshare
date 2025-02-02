import { GhostIcon } from "@yamada-ui/lucide";
import { Avatar, Card, CardBody, CardHeader, Center, For, Indicator, Text, Wrap } from "@yamada-ui/react";
import type { ClientData } from "openshare";

type ReciverProps = {
  id: string;
  isReady: boolean;
} & ClientData;

export default function Recivers({recivers}: {recivers: ReciverProps[]}) {
  return (
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
  );
}
