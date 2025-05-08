import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import dotenv from "dotenv";
import winston from "winston";
import fs from "fs/promises";
import { getVpnCode, checkSubscriptions } from "./vpnSponsor.js";

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

// Load environment variables
dotenv.config();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CHANNELS_FILE = "channels.json";

// Initialize REQUIRED_CHANNELS
let REQUIRED_CHANNELS = [];
async function loadChannels() {
  try {
    const data = await fs.readFile(CHANNELS_FILE, "utf8");
    REQUIRED_CHANNELS = JSON.parse(data);
    logger.info(
      `Loaded channels from ${CHANNELS_FILE}: ${JSON.stringify(
        REQUIRED_CHANNELS
      )}`
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.error(
        `Failed to load channels from ${CHANNELS_FILE}: ${error.message}`
      );
    } else {
      logger.info(`No ${CHANNELS_FILE} found; starting with empty channels`);
    }
    REQUIRED_CHANNELS = [];
    await saveChannels(); // Create empty channels.json
  }
}
async function saveChannels() {
  try {
    await fs.writeFile(
      CHANNELS_FILE,
      JSON.stringify(REQUIRED_CHANNELS, null, 2)
    );
    logger.info(
      `Saved channels to ${CHANNELS_FILE}: ${JSON.stringify(REQUIRED_CHANNELS)}`
    );
  } catch (error) {
    logger.error(
      `Failed to save channels to ${CHANNELS_FILE}: ${error.message}`
    );
  }
}

// Load channels on startup
loadChannels();

const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";

// Validate environment variables
if (!TELEGRAM_TOKEN) {
  logger.error("Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  logger.error("Missing ADMIN_PASSWORD in .env");
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(TELEGRAM_TOKEN);
const userRequests = new Map(); // Rate limiting
const admins = new Set(); // Store admin user IDs (in-memory)

/**
 * Escape MarkdownV2 special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeMarkdownV2(text) {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

/**
 * Escape Markdown special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeMarkdown(text) {
  return text.replace(/([_*`[])/g, "\\$1");
}

// Middleware for rate limiting
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const requests = userRequests.get(userId) || 0;
  if (requests > 10) {
    return ctx.reply(
      `${escapeMarkdownV2("🚫 Too many requests. Please try again later.")}`,
      { parse_mode: "MarkdownV2" }
    );
  }
  userRequests.set(userId, requests + 1);
  setTimeout(() => userRequests.set(userId, requests - 1), 60_000); // Reset after 1 minute
  return next();
});

/**
 * Fetch book recommendations from Google Books API (no API key required)
 * @param {string} query - Search query
 * @param {number} [maxResults=5] - Max number of results
 * @returns {Promise<Array<Object>>} - Array of book objects
 */
async function fetchBooks(query, maxResults = 5) {
  try {
    const response = await axios.get(GOOGLE_BOOKS_API_URL, {
      params: { q: query, maxResults },
    });
    if (!response.data.items) {
      logger.warn(`No books found for query: ${query}`);
      return [];
    }
    return response.data.items;
  } catch (error) {
    let errorMessage = `Error fetching books: ${error.message}`;
    if (error.response) {
      errorMessage += ` (Status: ${
        error.response.status
      }, Data: ${JSON.stringify(error.response.data)})`;
    }
    logger.error(errorMessage);
    throw new Error(
      `Failed to fetch books: ${error.response?.status || "Unknown error"}`
    );
  }
}

/**
 * Format book data into a readable string
 * @param {Array<Object>} books - Array of book objects
 * @returns {string} - Formatted book response
 */
function formatBookResponse(books) {
  if (!books.length) {
    return escapeMarkdownV2("No books found. Try a different query.");
  }

  let response = "📚 *Book Recommendations* 📚\n\n";
  for (const book of books) {
    const info = book.volumeInfo || {};
    const title = info.title || "Unknown Title";
    const authors = (info.authors || ["Unknown Author"]).join(", ");
    const description =
      (info.description || "No description available.").slice(0, 200) + "...";
    const link = info.infoLink || "#";
    response +=
      `📖 *${escapeMarkdownV2(title)}*\n` +
      `✍️ Authors: ${escapeMarkdownV2(authors)}\n` +
      `ℹ️ Description: ${escapeMarkdownV2(description)}\n` +
      `🔗 [More Info](${link})\n\n`;
  }
  return response;
}

// Start command with buttons
bot.command("start", (ctx) => {
  logger.info(`Processing /start for user ${ctx.from.id}`);
  const welcomeMessage = escapeMarkdownV2(
    "👋 Welcome to the Book Advice Bot!\n" +
      "I can recommend books and provide VPN codes after channel subscriptions.\n\n" +
      "Choose an option below:"
  );
  try {
    ctx.reply(welcomeMessage, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📚 Books", callback_data: "book" }],
          [{ text: "🌐 VPN", callback_data: "vpn" }],
        ],
      },
    });
    logger.info("Sent /start message with buttons");
  } catch (error) {
    logger.error(`Failed to send /start message: ${error.message}`);
    ctx.reply(
      escapeMarkdownV2("⚠️ Error displaying options. Please try again."),
      { parse_mode: "MarkdownV2" }
    );
  }
});

// Handle button clicks
bot.action("book", (ctx) => {
  ctx.reply(
    escapeMarkdownV2(
      "Enter a book query with /book <query>. Example: /book javascript"
    ),
    { parse_mode: "MarkdownV2" }
  );
  ctx.answerCbQuery();
});

bot.action("vpn", (ctx) => {
  ctx.reply(escapeMarkdownV2("To get a VPN code, use /vpn"), {
    parse_mode: "MarkdownV2",
  });
  ctx.answerCbQuery();
});

// Help command
bot.command("help", (ctx) => {
  const helpMessage = escapeMarkdownV2(
    "📖 *Book Advice Bot Commands* 📖\n\n" +
      "/start - Show welcome message and options\n" +
      "/book <query> - Search for book recommendations (e.g., /book javascript)\n" +
      "/vpn - Get a VPN code (requires channel subscriptions)\n" +
      '/admin <password> <channels> - Update required channels (e.g., /admin merdan1201 ["@channel1","@channel2"])\n' +
      "/help - Show this message"
  );
  ctx.reply(helpMessage, { parse_mode: "MarkdownV2" });
});

// Book command
bot.command("book", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!query) {
    return ctx.reply(
      escapeMarkdownV2(
        "Please provide a search query. Example: /book javascript"
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );
  }

  try {
    const books = await fetchBooks(query);
    const response = formatBookResponse(books);
    ctx.reply(response, {
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
  } catch (error) {
    ctx.reply(`${escapeMarkdownV2(`⚠️ ${error.message}. Please try again.`)}`, {
      parse_mode: "MarkdownV2",
    });
  }
});

// Admin command
bot.command("admin", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) {
    return ctx.reply(
      escapeMarkdownV2(
        'Please provide a password and channels. Example: /admin merdan1201 ["@Turkmen_Shadowsocks","@ubuntu24lts"]'
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );
  }

  // Extract password and channels
  let password, channels;
  try {
    const parts = args.match(/^(\S+)\s+(.+)$/);
    if (!parts) throw new Error("Invalid format");
    password = parts[1];
    channels = JSON.parse(parts[2]);
    logger.info(
      `Parsed /admin input: password=${password}, channels=${JSON.stringify(
        channels
      )}`
    );
  } catch (error) {
    logger.error(`Invalid /admin input: ${args}, Error: ${error.message}`);
    return ctx.reply(
      escapeMarkdownV2(
        '❌ Invalid format. Use: /admin <password> ["@channel1","@channel2"]'
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );
  }

  // Validate password
  if (password !== ADMIN_PASSWORD) {
    logger.info(`Invalid password attempt for /admin by user ${ctx.from.id}`);
    return ctx.reply(escapeMarkdownV2("❌ Invalid password."), {
      parse_mode: "MarkdownV2",
    });
  }

  // Validate channels
  if (
    !Array.isArray(channels) ||
    !channels.every((ch) => typeof ch === "string" && ch.startsWith("@"))
  ) {
    logger.info(
      `Invalid channels format by user ${ctx.from.id}: ${JSON.stringify(
        channels
      )}`
    );
    return ctx.reply(
      escapeMarkdownV2(
        "❌ Channels must be an array of valid Telegram usernames starting with @."
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );
  }

  // Verify bot is admin in channels
  for (const channel of channels) {
    try {
      const botMember = await bot.telegram.getChatMember(
        channel,
        bot.botInfo.id
      );
      if (!["administrator", "creator"].includes(botMember.status)) {
        logger.info(`Bot is not admin in ${channel}`);
        return ctx.reply(
          escapeMarkdownV2(
            `❌ Bot must be an admin in ${channel}. Please add the bot as an admin and try again.`
          ),
          {
            parse_mode: "MarkdownV2",
          }
        );
      }
    } catch (error) {
      logger.error(
        `Failed to verify bot admin status in ${channel}: ${error.message}`
      );
      return ctx.reply(
        escapeMarkdownV2(
          `❌ Error verifying bot admin status in ${channel}. Ensure the channel is public and the bot is an admin.`
        ),
        {
          parse_mode: "MarkdownV2",
        }
      );
    }
  }

  // Update channels and grant admin status
  const oldChannels = [...REQUIRED_CHANNELS];
  REQUIRED_CHANNELS = channels;
  await saveChannels();
  admins.add(ctx.from.id);
  ctx.reply(
    escapeMarkdownV2(
      `✅ You are now an admin! Required channels updated from [${oldChannels.join(
        ", "
      )}] to [${channels.join(", ")}]`
    ),
    {
      parse_mode: "MarkdownV2",
    }
  );
  logger.info(
    `Admin ${ctx.from.id} updated REQUIRED_CHANNELS from ${JSON.stringify(
      oldChannels
    )} to ${JSON.stringify(channels)}`
  );
});

// VPN command
bot.command("vpn", async (ctx) => {
  const userId = ctx.from.id;
  logger.info(
    `Processing /vpn for user ${userId}, admin=${admins.has(
      userId
    )}, channels=${JSON.stringify(REQUIRED_CHANNELS)}`
  );
  if (admins.has(userId)) {
    const code = getVpnCode();
    try {
      return ctx.reply(
        escapeMarkdownV2(
          `🌐 *VPN Code* 🌐\n\nYour code: \`${code}\`\n\nUse it to activate your VPN!\n(Granted due to admin status)`
        ),
        { parse_mode: "MarkdownV2" }
      );
    } catch (error) {
      logger.error(`Failed to send /vpn admin response: ${error.message}`);
      return ctx.reply(
        escapeMarkdownV2("⚠️ Error sending VPN code. Please try again."),
        { parse_mode: "MarkdownV2" }
      );
    }
  }

  try {
    const { isSubscribed, notSubscribedChannels } = await checkSubscriptions(
      bot,
      userId,
      REQUIRED_CHANNELS
    );
    if (isSubscribed) {
      const code = getVpnCode();
      try {
        ctx.reply(
          escapeMarkdownV2(
            `🌐 *VPN Code* 🌐\n\nYour code: \`${code}\`\n\nUse it to activate your VPN!\n(Granted due to channel subscriptions)`
          ),
          { parse_mode: "MarkdownV2" }
        );
      } catch (error) {
        logger.error(
          `Failed to send /vpn subscription response: ${error.message}`
        );
        ctx.reply(
          escapeMarkdownV2("⚠️ Error sending VPN code. Please try again."),
          { parse_mode: "MarkdownV2" }
        );
      }
    } else {
      // Simplify channel list for mobile compatibility
      const channelLinks = notSubscribedChannels
        .map(
          (channel) =>
            `${escapeMarkdown(channel)}: https://t.me/${channel.slice(1)}`
        )
        .join("\n");
      const response = `Please subscribe to the following channels to get a VPN code:\n\n${channelLinks}\n\nAfter subscribing, try /vpn again.`;
      logger.info(`Sending /vpn response to user ${userId}: ${response}`);
      ctx.reply(response, { parse_mode: "Markdown" });
    }
  } catch (error) {
    logger.error(`Error checking subscriptions: ${error.message}`);
    ctx.reply(
      escapeMarkdownV2(
        "⚠️ Error checking subscriptions. Please try again later."
      ),
      { parse_mode: "MarkdownV2" }
    );
  }
});

// Error handling
bot.catch((err, ctx) => {
  logger.error(
    `Error for update ${JSON.stringify(ctx.update)}: ${err.message}`
  );
  ctx.reply(escapeMarkdownV2("⚠️ An error occurred. Please try again later."), {
    parse_mode: "MarkdownV2",
  });
});

// Start bot
async function main() {
  logger.info("Starting bot...");
  await bot.launch();
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  logger.error(`Failed to start bot: ${err.message}`);
  process.exit(1);
});
