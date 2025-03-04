import { reactRouter } from "@react-router/dev/vite";
import { reactRouterDevTools } from "react-router-devtools";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactRouterDevTools(), reactRouter(), tsconfigPaths()],
  server: {
    https: {
      cert: "../backend/localhost-cert.pem",
      key: "../backend/localhost-privkey.pem",
    },
    proxy: {},
  },
  define: {
    "import.meta.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
  },
});
