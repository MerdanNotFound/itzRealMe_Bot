import winston from "winston";

// Configure logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Check if user is subscribed to all required channels
 * @param {import('telegraf').Telegraf} bot - Telegram bot instance
 * @param {number} userId - User ID
 * @param {string[]} channels - Array of channel usernames
 * @returns {Promise<{ isSubscribed: boolean, notSubscribedChannels: string[] }>} - Subscription status
 */
export async function checkSubscriptions(bot, userId, channels) {
  if (!channels.length) {
    logger.info("No channels required; granting VPN code access");
    return { isSubscribed: true, notSubscribedChannels: [] };
  }

  const notSubscribedChannels = [];
  for (const channel of channels) {
    try {
      const member = await bot.telegram.getChatMember(channel, userId);
      if (!["member", "administrator", "creator"].includes(member.status)) {
        notSubscribedChannels.push(channel);
        logger.info(`User ${userId} is not subscribed to ${channel}`);
      } else {
        logger.info(`User ${userId} is subscribed to ${channel}`);
      }
    } catch (error) {
      logger.error(
        `Failed to check subscription for ${channel}: ${error.message}`
      );
      notSubscribedChannels.push(channel); // Assume not subscribed if error occurs
    }
  }

  const isSubscribed = notSubscribedChannels.length === 0;
  logger.info(
    `User ${userId} subscription check: isSubscribed=${isSubscribed}, notSubscribedChannels=${JSON.stringify(
      notSubscribedChannels
    )}`
  );
  return { isSubscribed, notSubscribedChannels };
}

/**
 * Generate a VPN code (placeholder)
 * @returns {string} - VPN code
 */
export function getVpnCode() {
  // Replace with your actual VPN code generation logic (e.g., API call, random code)
  return `VPN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
