import { Center, NativeImage, Text } from "@yamada-ui/react";

import opens from "@/assets/openshare-loading.svg";

export default function LoadingScreen() {
  return (
    <Center mt="3xl">
      <NativeImage src={opens} alt="Open Share" boxSize="4rem" />
      <Text>読み込み中...</Text>
    </Center>
  );
}
