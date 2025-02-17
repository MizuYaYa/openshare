import { appConfig } from "./config/app.js";

export async function createTurnCredential(ttl?: number) {
  const { tokenId, apiToken } = appConfig.app.turn;
  const apiUrl = `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate`;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      // biome-ignore lint/style/useNamingConvention: AuthorizationのAは大文字!
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ ttl: ttl || 3600 }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create turn credentials: ${res.statusText}`);
  }

  const data: { iceServers: RTCIceServer } = await res.json();
  return data.iceServers;
}
