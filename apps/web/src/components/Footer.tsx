import { Box, Heading, Text } from "@yamada-ui/react";

export default function Footer() {
  return (
    <Box as="footer">
      <Heading>Open Share</Heading>
      <Text>v{import.meta.env.APP_VERSION}</Text>
    </Box>
  );
}
