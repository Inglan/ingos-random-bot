import { App, subtype } from "@slack/bolt";
import type { RichTextBlockElement, RichTextElement } from "@slack/types";
import { CHANNEL_ID } from "./constants";

// ClearURLs rules types
interface ClearURLsProvider {
  urlPattern: string;
  completeProvider?: boolean;
  rules?: string[];
  rawRules?: string[];
  referralMarketing?: string[];
  exceptions?: string[];
  redirections?: string[];
  forceRedirection?: boolean;
}

interface ClearURLsData {
  providers: Record<string, ClearURLsProvider>;
}

// Cache for ClearURLs rules
let clearURLsRules: ClearURLsData | null = null;
let rulesFetchPromise: Promise<ClearURLsData> | null = null;

async function fetchClearURLsRules(): Promise<ClearURLsData> {
  if (clearURLsRules) {
    return clearURLsRules;
  }

  if (rulesFetchPromise) {
    return await rulesFetchPromise;
  }

  rulesFetchPromise = (async () => {
    try {
      const response = await fetch(
        "https://rules2.clearurls.xyz/data.minify.json"
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch ClearURLs rules: ${response.status}`);
      }
      const data = (await response.json()) as ClearURLsData;
      clearURLsRules = data;
      return data;
    } catch (error) {
      console.error("Error fetching ClearURLs rules:", error);
      // Return empty rules on error
      const emptyRules: ClearURLsData = { providers: {} };
      return emptyRules;
    } finally {
      rulesFetchPromise = null;
    }
  })();

  return await rulesFetchPromise;
}

function checkURLAgainstRules(url: string, rules: ClearURLsData): string[] {
  const complaints: string[] = [];
  const urlObj = new URL(url);
  const fullURL = urlObj.href;

  // Check each provider
  for (const [providerName, provider] of Object.entries(rules.providers)) {
    try {
      // Check if URL matches the provider's pattern
      const urlPattern = new RegExp(provider.urlPattern);
      if (!urlPattern.test(fullURL)) {
        continue;
      }

      // Check exceptions first
      if (provider.exceptions) {
        const matchesException = provider.exceptions.some((exception) => {
          try {
            return new RegExp(exception).test(fullURL);
          } catch {
            return false;
          }
        });
        if (matchesException) {
          continue;
        }
      }

      // If completeProvider is true, the entire URL should be blocked
      if (provider.completeProvider) {
        complaints.push(
          `Matches tracking provider "${providerName}" which should be blocked entirely`
        );
        continue;
      }

      // Check rules (query parameters)
      if (provider.rules) {
        for (const rule of provider.rules) {
          try {
            // Convert rule to regex pattern as per ClearURLs spec
            // Rules are automatically rewritten to: (?:&|[/?#&])(?:<field name>=[^&]*)
            const rulePattern = new RegExp(
              `(?:&|[/?#&])(?:${rule}=[^&]*)`,
              "i"
            );
            if (rulePattern.test(fullURL)) {
              complaints.push(
                `Contains tracking parameter "${rule}" (matched by provider "${providerName}")`
              );
            }
          } catch (error) {
            // Skip invalid regex patterns
            console.warn(`Invalid rule pattern: ${rule}`, error);
          }
        }
      }

      // Check rawRules (regex patterns applied directly to URL)
      if (provider.rawRules) {
        for (const rawRule of provider.rawRules) {
          try {
            const rawRulePattern = new RegExp(rawRule, "i");
            if (rawRulePattern.test(fullURL)) {
              complaints.push(
                `Matches tracking pattern from provider "${providerName}"`
              );
            }
          } catch (error) {
            // Skip invalid regex patterns
            console.warn(`Invalid rawRule pattern: ${rawRule}`, error);
          }
        }
      }
    } catch (error) {
      // Skip providers with invalid urlPattern
      console.warn(`Invalid urlPattern for provider ${providerName}:`, error);
    }
  }

  return complaints;
}

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
      (block) => block.type === "rich_text"
    );

    textBlocks?.forEach((block) => {
      if ("elements" in block && Array.isArray(block.elements)) {
        block.elements.forEach((element) => {
          if (
            "elements" in element &&
            Array.isArray(element.elements) &&
            typeof element === "object"
          ) {
            element.elements.forEach((innerElement) => {
              if (
                typeof innerElement === "object" &&
                innerElement !== null &&
                "type" in innerElement &&
                innerElement.type === "link" &&
                "url" in innerElement
              ) {
                links.push({
                  type: "link",
                  url: String(innerElement.url),
                  text:
                    "text" in innerElement
                      ? String(innerElement.text)
                      : undefined,
                });
              }
            });
          }
        });
      }
    });

    const complaintListItems: { title: string; items: string[] }[] = [];

    // Fetch ClearURLs rules
    const rules = await fetchClearURLsRules();

    links.forEach((link) => {
      const complaints = checkURLAgainstRules(link.url, rules);

      // Check for amzn.asia short links
      try {
        const linkObj = new URL(link.url);
        if (linkObj.hostname === "amzn.asia") {
          complaints.push(
            "This is a short Amazon link that can be used to track who sent the link, and associate you with anyone who clicks it"
          );
        }
      } catch {
        // Invalid URL, skip
      }

      if (complaints.length != 0) {
        complaintListItems.push({
          title: link.url,
          items: complaints,
        });
      }
    });

    if (complaintListItems.length != 0) {
      const richTextElements: RichTextBlockElement[] = [
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
