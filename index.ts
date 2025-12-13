import { App } from "@slack/bolt";

// Initializes your app with your Slack app and bot token
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.event("member_joined_channel", async ({ event }) => {
  await app.client.chat.postMessage({
    channel: event.channel,
    text: `Welcome to the channel, <@${event.user}>!`,
  });
});

(async () => {
  // Start your app
  await app.start();

  app.logger.info("⚡️ Bolt app is running!");
})();
