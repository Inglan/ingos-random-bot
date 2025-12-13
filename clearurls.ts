// ClearURLs rules types
export interface ClearURLsProvider {
  urlPattern: string;
  completeProvider?: boolean;
  rules?: string[];
  rawRules?: string[];
  referralMarketing?: string[];
  exceptions?: string[];
  redirections?: string[];
  forceRedirection?: boolean;
}

export interface ClearURLsData {
  providers: Record<string, ClearURLsProvider>;
}

// Cache for ClearURLs rules
let clearURLsRules: ClearURLsData | null = null;
let rulesFetchPromise: Promise<ClearURLsData> | null = null;

export async function fetchClearURLsRules(): Promise<ClearURLsData> {
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

export function checkURLAgainstRules(
  url: string,
  rules: ClearURLsData
): string[] {
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
