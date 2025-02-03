import Header from "@/components/Header";
import Receiver from "@/components/Receiver";
import Sender from "@/components/Sender";
import { useParams } from "react-router";

function App() {
  const { roomId } = useParams();

  return (
    <>
      <Header />
      {roomId ? <Receiver /> : <Sender />}
    </>
  );
}

export default App;
