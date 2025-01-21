import { Center, Heading, NativeImg } from "@yamada-ui/react";
import openShareLogo from "./assets/openshare.svg";

function App() {
  return (
    <>
      <Center>
        <Heading>Welcome Open Share</Heading>
        <NativeImg src={openShareLogo} h="xl" />
      </Center>
    </>
  );
}

export default App;
