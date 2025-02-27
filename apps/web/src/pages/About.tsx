import openShareLogo from "@/assets/openshare.svg";
import { Box, Center, Heading, NativeImg, Text } from "@yamada-ui/react";

export default function About() {
  return (
    <>
      <Center>
        <Box mr="xl">
          <Heading>Open Share</Heading>
          <Text>v{import.meta.env.APP_VERSION}</Text>
        </Box>
        <NativeImg src={openShareLogo} h="xs" />
      </Center>
    </>
  );
}
