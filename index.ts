import { App, subtype } from "@slack/bolt";
import { CHANNEL_ID } from "./constants";

// Initializes your app with your Slack app and bot token
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.event("member_joined_channel", async ({ event }) => {
  if (event.channel != CHANNEL_ID) return;

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

app.action("ultrafastparrot", async ({ body, context, ack }) => {
  await ack();

  await app.client.chat.postMessage({
    channel: body.channel?.id!,
    text: ":ultrafastparrot:".repeat(20) + "\nSent by " + context.userId,
    blocks: [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: Array(20).fill({ type: "emoji", name: "conga_parrot" }),
          },
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: "Sent by " },
              { type: "user", user_id: context.userId },
            ],
          },
        ],
      },
    ],
  });
});

app.event("message", async ({ event, say }) => {
  if (
    event.subtype === undefined &&
    event.channel_type == "channel" &&
    event.text
  ) {
    const links: Array<{ type: "link"; url: string; text?: string }> = [];

    const textBlocks = event.blocks?.filter(
      (block) => block.type === "rich_text",
    );

    textBlocks?.forEach((block) => {
      if ("elements" in block && Array.isArray(block.elements)) {
        block.elements.forEach((element: any) => {
          if (element.elements && Array.isArray(element.elements)) {
            element.elements.forEach((innerElement: any) => {
              if (innerElement.type === "link") {
                links.push(innerElement);
              }
            });
          }
        });
      }
    });

    const complaintListItems: { title: string; items: string[] }[] = [];

    links.forEach((link) => {
      const linkObj = new URL(link.url);
      const hostname = linkObj.hostname;
      const params = new URLSearchParams(linkObj.search);

      const complaints = [];

      if (params.get("si")) {
        complaints.push(
          "Has an si parameter that can be used to track who sent the link, and associate you with anyone who clicks it",
        );
      }

      complaintListItems.push({
        title: link.url,
        items: complaints,
      });
    });

    if (complaintListItems.length != 0) {
      const richTextElements = [
        {
          type: "rich_text_section",
          elements: [
            {
              type: "text",
              text: "There are some issues with links in your message:\n\n",
            },
          ],
        },
      ];

      complaintListItems.forEach((complaintItem) => {
        // Add the link title
        richTextElements.push({
          type: "rich_text_section",
          elements: [
            {
              type: "link",
              url: complaintItem.title,
              text: complaintItem.title,
            },
          ],
        });

        // Add the list of complaints
        if (complaintItem.items.length > 0) {
          richTextElements.push({
            type: "rich_text_list",
            style: "bullet",
            elements: complaintItem.items.map((item) => ({
              type: "rich_text_section",
              elements: [
                {
                  type: "text",
                  text: item,
                },
              ],
            })),
          });
        }
      });

      await say({
        blocks: [
          {
            type: "rich_text",
            elements: richTextElements,
          },
        ],
      });
    }
  }
});

(async () => {
  // Start your app
  await app.start();

  app.logger.info("⚡️ Bolt app is running!");
})();
