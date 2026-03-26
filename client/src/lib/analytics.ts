export interface AnalyticsConfig {
  endpoint: string;
  websiteId: string;
}

export function getAnalyticsConfig(env: Record<string, string | undefined>): AnalyticsConfig | null {
  const endpoint = env.VITE_ANALYTICS_ENDPOINT?.trim();
  const websiteId = env.VITE_ANALYTICS_WEBSITE_ID?.trim();

  if (!endpoint || !websiteId) return null;

  return {
    endpoint: endpoint.replace(/\/$/, ""),
    websiteId,
  };
}

export function injectAnalyticsScript(doc: Document, config: AnalyticsConfig): void {
  if (doc.querySelector('script[data-analytics="umami"]')) return;

  const script = doc.createElement("script");
  script.defer = true;
  script.src = `${config.endpoint}/umami`;
  script.dataset.websiteId = config.websiteId;
  script.dataset.analytics = "umami";
  doc.head.appendChild(script);
}
