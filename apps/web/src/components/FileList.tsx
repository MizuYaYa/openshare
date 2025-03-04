import { TrashIcon } from "@yamada-ui/lucide";
import {
  Box,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Flex,
  For,
  FormatByte,
  Heading,
  IconButton,
  Progress,
  ScrollArea,
  Spacer,
  Stack,
  Text,
  Tooltip,
} from "@yamada-ui/react";
import type { Dispatch, SetStateAction } from "react";

import type { QueuedFile, Receiver } from "@/pages/Sender";

export type SenderFilesProps = {
  files: QueuedFile[];
  setFiles: Dispatch<SetStateAction<QueuedFile[]>>;
  receivers: Receiver[];
};

export default function FileList({ files, setFiles, receivers }: SenderFilesProps) {
  return (
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
        {({ file, start, end }, i) => {
          const totalSentBytes = receivers
            .map((receiver) => receiver.filesSendState[file.name]?.sentByte || 0)
            .reduce((a, c) => a + c, 0);
          const sentPercentage =
            receivers.length > 0 ? Number((((totalSentBytes / file.size) * 100) / receivers.length).toFixed(0)) : 0;

          return (
            <Card key={i}>
              <CardHeader>
                <Tooltip label={file.name} placement="top" fontSize="xs">
                  <Heading fontSize="sm" overflow="hidden" textOverflow="ellipsis" lineClamp={2}>
                    {file.name}
                  </Heading>
                </Tooltip>
              </CardHeader>
              <CardBody>
                <Box w="full">
                  <Flex fontSize="sm" justifyContent="space-between">
                    <Text> {sentPercentage}%</Text>
                    <Text>{start && end ? ((end.getTime() - start.getTime()) / 1000).toFixed(1) : "???"}秒経過</Text>
                  </Flex>
                  <Progress value={sentPercentage} rounded="sm" />
                </Box>
              </CardBody>
              <CardFooter>
                <FormatByte value={file.size} />
                <Spacer />
                <IconButton
                  icon={<TrashIcon />}
                  onClick={() => {
                    setFiles((prev) => prev.filter((f) => f.file !== file));
                  }}
                />
              </CardFooter>
            </Card>
          );
        }}
      </For>
    </ScrollArea>
  );
}
