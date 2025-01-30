import Header from "@/components/Header";
import Reciver from "@/components/Reciver";
import Sender from "@/components/Sender";
import { useParams } from "react-router";

function App() {
  const { roomId } = useParams();

  return (
    <>
      <Header />
      {roomId ? <Reciver /> : <Sender />}
    </>
  );
}

export default App;
