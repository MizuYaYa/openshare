import { UIProvider } from "@yamada-ui/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import AppLayout from "@/layouts/AppLayout";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";
import Receiver from "@/pages/Receiver";
import Sender from "@/pages/Sender";

// biome-ignore lint/style/noNonNullAssertion:
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UIProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="/" element={<Sender />} />
            <Route path="/connect/:roomId" element={<Receiver />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/about" element={<About />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  </StrictMode>,
);
