import { Box, Center, Heading, NativeImg, Text } from "@yamada-ui/react";
import openShareLogo from "@/assets/openshare.svg";

export default function About() {
  return (
    <>
      <Center>
        <Box mr="xl">
          <Heading>Open Share</Heading>
          <Text>v0.1.0</Text>
        </Box>
        <NativeImg src={openShareLogo} h="xs" />
      </Center>
    </>
  );
}
