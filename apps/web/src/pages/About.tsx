import openShareLogo from "@/assets/openshare.svg";
import { Box, Center, Heading, NativeImg, Text } from "@yamada-ui/react";

export default function About() {
  return (
    <>
      <Center>
        <Box mr="xl">
          <Heading>Open Share</Heading>
          <Text>v0.2.0</Text>
        </Box>
        <NativeImg src={openShareLogo} h="xs" />
      </Center>
    </>
  );
}
