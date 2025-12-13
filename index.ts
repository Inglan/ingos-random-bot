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
    blocks: [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "Welcome to Ingo's channel ",
              },
              {
                type: "user",
                user_id: event.user,
              },
              {
                type: "text",
                text: "! ",
              },
              {
                type: "emoji",
                name: "ultrafastparrot",
              },
              {
                type: "text",
                text: "\n\nThis is where I post daily updates, and random stuff, as you may have guess from the name :) Also if you want to see me crashing out, you can also join ",
              },
              {
                type: "channel",
                channel_id: "C09PB8F6Z9U",
              },
            ],
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ":ultrafastparrot:",
              emoji: true,
            },
            value: "ultrafastparrot",
            action_id: "ultrafastparrot",
          },
        ],
      },
    ],
  });
});

app.action("ultrafastparrot", async ({ body, ack }) => {
  await ack();
  await app.client.chat.postMessage({
    channel: body.channel?.id!,
    text: ":conga_parrot:".repeat(15),
  });
});

(async () => {
  // Start your app
  await app.start();

  app.logger.info("⚡️ Bolt app is running!");
})();
