import { TrashIcon } from "@yamada-ui/lucide";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  For,
  FormatByte,
  Heading,
  IconButton,
  ScrollArea,
  Spacer,
  Stack,
  Text,
  Tooltip,
} from "@yamada-ui/react";
import type { Dispatch, SetStateAction } from "react";

export type SenderFilesProps = {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
};

export default function FileList({ files, setFiles }: SenderFilesProps) {
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
                  setFiles((prev) => prev.filter((f) => f !== file));
                }}
              />
            </CardFooter>
          </Card>
        )}
      </For>
    </ScrollArea>
  );
}
