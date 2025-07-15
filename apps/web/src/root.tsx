import { ColorModeScript, UIProvider, defaultConfig } from "@yamada-ui/react";
import { type ReactNode, useEffect } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root.ts";

import LoadingScreen from "@/components/LoadingScreen";
import { getReceiveTempDirHandle } from "./utils/opfs.ts";

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    href: "/openshare-fav.svg",
    type: "image/svg+xml",
  },
];

export function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    (async () => {
      const receiveTempDir = await getReceiveTempDirHandle();
      let deletedCount = 0;
      for await (const fileName of receiveTempDir.keys()) {
        receiveTempDir.removeEntry(fileName);
        deletedCount++;
      }
      console.log(deletedCount ? `過去に受信した${deletedCount}個のファイルを削除` : "削除ファイルなし");
    })();
  }, []);

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="URLを共有して複数人にリアルタイムでファイルを送信できるwebアプリ" />
        <meta property="og:title" content="Open Share" />
        <meta property="og:site_name" content="Open Share" />
        <meta property="og:description" content="URLを共有して複数人にリアルタイムでファイルを送信できるwebアプリ" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={import.meta.env.VITE_OGP_IMAGE_URL} />
        <meta property="og:url" content={import.meta.env.VITE_SITE_URL} />
        <meta property="og:locale" content="ja_JP" />
        <meta name="twitter:card" content="summary_large_image" />
        <title>Open Share</title>
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <ColorModeScript initialColorMode={defaultConfig.initialColorMode} />
        <UIProvider>{children}</UIProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <LoadingScreen />;
}

export default function Root() {
  return <Outlet />;
}
