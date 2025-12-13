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
    text: `Welcome to Ingo's channel <@${event.user}>! :ultrafastparrot: This is where I post daily updates, and random stuff, as you may have guess from the name :) Also if you want to see me crashing out, you can also join `,
  });
});

(async () => {
  // Start your app
  await app.start();

  app.logger.info("⚡️ Bolt app is running!");
})();
