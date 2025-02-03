import { GhostIcon } from "@yamada-ui/lucide";
import { Avatar, Card, CardBody, CardHeader, Center, For, Indicator, Text, Wrap } from "@yamada-ui/react";
import type { ClientData } from "openshare";

type ReceiverProps = {
  id: string;
  isReady: boolean;
} & ClientData;

export default function Receivers({ receivers }: { receivers: ReceiverProps[] }) {
  return (
    <Wrap gap="xl">
      <For each={receivers} fallback={<Center>受信者がいません</Center>}>
        {receiver => (
          <Indicator key={receiver.id} label="通信中" pingScale={2}>
            <Card>
              <CardHeader>
                <Avatar icon={<GhostIcon />} />
              </CardHeader>
              <CardBody>
                <Text>{receiver.os}</Text>
                <Text>{receiver.browser}</Text>
              </CardBody>
            </Card>
          </Indicator>
        )}
      </For>
    </Wrap>
  );
}
