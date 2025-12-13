import { App } from "@slack/bolt";

// Initializes your app with your Slack app and bot token
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

(async () => {
  // Start your app
  await app.start();

  await app.client.chat.postMessage({
    channel: "C0A0QNJNDGQ",
    text: "testing",
  });

  app.logger.info("⚡️ Bolt app is running!");
})();
