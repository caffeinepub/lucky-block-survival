/**
 * moderationSettings.ts
 *
 * localStorage-backed helpers for maintenance mode and webhook config.
 */

const MAINTENANCE_KEY = "portal_maintenance_mode";
const WEBHOOK_CONFIG_KEY = "portal_webhook_config";

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
    if (raw) return JSON.parse(raw) as WebhookConfig;
    // Migrate from old key if present
    const legacyUrl = localStorage.getItem("portal_webhook_punishment") ?? "";
    return { url: legacyUrl, enabled: false };
  } catch {
    return { url: "", enabled: false };
  }
}

export function saveWebhookConfig(config: WebhookConfig): void {
  localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(config));
}
