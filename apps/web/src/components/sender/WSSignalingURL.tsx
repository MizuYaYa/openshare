import { ClipboardCheckIcon, CopyIcon } from "@yamada-ui/lucide";
import {
  Box,
  Fieldset,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalFooter,
  Tag,
  Text,
  useBreakpoint,
  useClipboard,
  useDisclosure,
  useNotice,
} from "@yamada-ui/react";
import { QRCodeSVG } from "qrcode.react";

export type WSSignalingURLProps = {
  wsState: number;
  connectURL: string;
};

export default function WSSignalingURL({ connectURL, wsState }: WSSignalingURLProps) {
  const { onCopy, hasCopied } = useClipboard();
  const { open, onOpen, onClose } = useDisclosure();
  const breakpoint = useBreakpoint();
  const notice = useNotice();

  const serverStatus = ["接続試行中", "通信中", "切断中", "切断"];

  return (
    <Box>
      <Fieldset
        legend="共有URL"
        helperMessage="受信者にURLを共有します"
        optionalIndicator={
          <Tag size="sm" ms="sm">
            {serverStatus[wsState]}
          </Tag>
        }
      >
        <InputGroup size="md">
          <Input value={connectURL} readOnly htmlSize={75} name="roomId" pr="20" />
          <InputRightElement clickable>
            <IconButton
              icon={hasCopied ? <ClipboardCheckIcon /> : <CopyIcon />}
              onClick={() => {
                onCopy(connectURL);

                if (breakpoint !== "sm" && breakpoint !== "md") {
                  notice({
                    duration: 1500,
                    title: "Copied",
                    description: connectURL,
                    status: "success",
                    isClosable: true,
                    placement: "bottom-left",
                  });
                }
              }}
              size="sm"
              variant="ghost"
              color={hasCopied ? "green" : undefined}
              disabled={!connectURL}
            />
          </InputRightElement>
        </InputGroup>
      </Fieldset>
      <Box display="inline-flex" p="md" onClick={onOpen} cursor="pointer">
        {connectURL ? <QRCodeSVG value={connectURL} /> : null}
        <Modal open={open} onClose={onClose} size="2xl" bgColor="#FFF">
          <ModalBody overflow="hidden">
            {connectURL ? <QRCodeSVG value={connectURL} size={512} width="100%" marginSize={4} /> : null}
          </ModalBody>
          <ModalFooter>
            <Text fontSize="2xs">{connectURL}</Text>
          </ModalFooter>
        </Modal>
      </Box>
    </Box>
  );
}
