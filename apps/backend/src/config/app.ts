if (!process.env.TURN_TOKEN_ID) {
  throw new Error("TURN_TOKEN_ID must be set");
}

if (!process.env.TURN_API_TOKEN) {
  throw new Error("TURN_API_TOKEN must be set");
}

export const appConfig = {
  app: {
    turn: {
      tokenId: process.env.TURN_TOKEN_ID,
      apiToken: process.env.TURN_API_TOKEN,
    },
  },
};
