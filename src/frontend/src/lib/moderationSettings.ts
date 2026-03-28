/**
 * moderationSettings.ts
 *
 * localStorage-backed helpers for maintenance mode and webhook config.
 */

const MAINTENANCE_KEY = "portal_maintenance_mode";
const WEBHOOK_CONFIG_KEY = "portal_webhook_config";

const DEFAULT_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1487211030282108938/4zE0nRI-E7WyoPv9e83iqBbwlFJVGlZUNRXoI8r2xsQezn2u4hbrj0gEY7C_6GqP3cSV";

export function getMaintenanceMode(): boolean {
  try {
    return localStorage.getItem(MAINTENANCE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMaintenanceMode(val: boolean): void {
  localStorage.setItem(MAINTENANCE_KEY, String(val));
}

export interface WebhookConfig {
  url: string;
  enabled: boolean;
}

export function getWebhookConfig(): WebhookConfig {
  try {
    const raw = localStorage.getItem(WEBHOOK_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WebhookConfig;
      // If URL was never set, fill in the default
      if (!parsed.url) parsed.url = DEFAULT_WEBHOOK_URL;
      return parsed;
    }
    // Migrate from old key if present
    const legacyUrl =
      localStorage.getItem("portal_webhook_punishment") ?? DEFAULT_WEBHOOK_URL;
    return { url: legacyUrl || DEFAULT_WEBHOOK_URL, enabled: true };
  } catch {
    return { url: DEFAULT_WEBHOOK_URL, enabled: true };
  }
}

export function saveWebhookConfig(config: WebhookConfig): void {
  localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));
}

export { DEFAULT_WEBHOOK_URL };
