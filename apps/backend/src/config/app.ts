if (!process.env.TURN_TOKEN_ID) {
  throw new Error("TURN_TOKEN_ID must be set");
}

if (!process.env.TURN_API_TOKEN) {
  throw new Error("TURN_API_TOKEN must be set");
}

function safelyParseInt(inputValue: string | undefined) {
  if (inputValue) {
    const parsed = Number.parseInt(inputValue);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export const appConfig = {
  app: {
    turn: {
      tokenId: process.env.TURN_TOKEN_ID,
      apiToken: process.env.TURN_API_TOKEN,
    },
    port: safelyParseInt(process.env.PORT) || 3000,
  },
};
