import { UIProvider } from "@yamada-ui/react";
import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import AppLayout from "@/layouts/AppLayout";

const Sender = lazy(() => import("@/pages/Sender"));
const Receiver = lazy(() => import("@/pages/Receiver"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const About = lazy(() => import("@/pages/About"));

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
