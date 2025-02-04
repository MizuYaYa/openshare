import openShareLogo from "@/assets/openshare.svg";
import { Flex, Heading, NativeImage } from "@yamada-ui/react";

export default function Header() {
  return (
    <Flex as="header" h="5xs" align="center" p="sm" bg="gray.800" color="white" gap="sm">
      <NativeImage src={openShareLogo} alt="Open Share Logo" h="6xs" />
      <Heading>Open Share</Heading>
    </Flex>
  );
}
