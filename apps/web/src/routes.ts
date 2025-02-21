import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("./layouts/AppLayout.tsx", [
    index("./pages/Sender.tsx"),
    route("/connect/:roomId", "./pages/Receiver.tsx"),
    route("*", "./pages/NotFound.tsx"),
  ]),
  route("/about", "./pages/About.tsx"),
] satisfies RouteConfig;
