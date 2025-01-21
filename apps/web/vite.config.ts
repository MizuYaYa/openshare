import react from "@vitejs/plugin-react-swc";
import { defaultConfig, getColorModeScript } from "@yamada-ui/react";
import { type Plugin, defineConfig } from "vite";

function injectScript(): Plugin {
  return {
    name: "vite-plugin-inject-scripts",
    transformIndexHtml(html) {
      const content = getColorModeScript({
        initialColorMode: defaultConfig.initialColorMode,
      });

      return html.replace("<body>", `<body><script>${content}</script>`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), injectScript()],
});
