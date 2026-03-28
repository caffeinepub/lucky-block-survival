/**
 * discordWebhook.ts
 *
 * Sends punishment log embeds to the configured Discord webhook.
 */

import { getWebhookConfig } from "./moderationSettings";
import type { LocalPunishmentLog } from "./portalData";

function getEmbedColor(duration: string): number {
  const lower = (duration ?? "").toLowerCase();
  if (lower.includes("ban") || lower.includes("perm")) return 0xef4444; // red
  if (lower.includes("jail")) return 0xf59e0b; // amber
  if (lower.includes("mute")) return 0x3b82f6; // blue
  return 0x94a3b8; // gray — verbal warn etc.
}

export async function sendPunishmentWebhook(
  log: LocalPunishmentLog,
): Promise<void> {
  const config = getWebhookConfig();
  if (!config.enabled || !config.url.trim()) return;

  const caseId = String(log.id).slice(-8);
  const duration = log.duration ?? log.rnd ?? "N/A";
  const embed = {
    title: `🛡️ Punishment Logged — ${log.category ?? "Unknown"}`,
    color: getEmbedColor(duration),
    thumbnail: {
      url: `https://mc-heads.net/avatar/${log.ign}/64`,
    },
    fields: [
      { name: "Player IGN", value: `**${log.ign}**`, inline: true },
      { name: "Issued By", value: log.submittedBy, inline: true },
      {
        name: "Offense #",
        value: `#${log.offenseLevel ?? log.offenseNumber}`,
        inline: true,
      },
      { name: "Offense Type", value: log.category ?? "Unknown", inline: true },
      { name: "Duration", value: `\`${duration}\``, inline: true },
      {
        name: "Evidence",
        value:
          log.proof && log.proof.length > 0
            ? log.proof.startsWith("http")
              ? `[View Proof](${log.proof})`
              : log.proof
            : "Not provided by issuing staff",
        inline: false,
      },
    ],
    footer: {
      text: `Case ID: ${caseId} | ${new Date(log.timestamp).toUTCString()}`,
    },
  };

  await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: "no-cors",
    body: JSON.stringify({ embeds: [embed] }),
  });
}
