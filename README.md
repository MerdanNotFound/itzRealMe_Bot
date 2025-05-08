# Telegram Book & VPN Bot

A Telegram bot that provides book recommendations using the Google Books API and distributes VPN codes upon subscribing to required Telegram channels. Admins can manage the list of required channels dynamically without editing configuration files. The bot is built with Node.js and uses free, open-source dependencies for a cost-effective solution.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Bot](#running-the-bot)
- [Usage](#usage)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Book Recommendations**: Search for books using the public Google Books API with the `/book <query>` command (e.g., `/book javascript`).
- **VPN Code Distribution**: Grants VPN codes via the `/vpn` command, requiring non-admin users to subscribe to specified Telegram channels.
- **Dynamic Channel Management**: Admins can update required channels using `/admin <password> <channels>` (e.g., `/admin merdan1201 ["@channel1","@channel2"]`), stored in `channels.json` for persistence.
- **Admin Bypass**: Admins bypass channel subscription requirements for VPN codes.
- **Interactive Interface**: `/start` command provides buttons for Books and VPN options.
- **Help Command**: `/help` lists all available commands.
- **Rate Limiting**: Prevents abuse by limiting user requests (10 per minute).
- **Logging**: Comprehensive logging with `winston` for debugging and monitoring.
- **Mobile-Friendly**: Optimized responses for Telegram mobile clients (iOS/Android).
- **Free & Lightweight**: Uses free dependencies and file-based persistence (`channels.json`) to avoid paid databases.

## Prerequisites
- **Node.js**: Version 18 or higher (tested with v22.11.0). Install from [nodejs.org](https://nodejs.org/).
- **Telegram Bot Token**: Obtain from `@BotFather` on Telegram.
- **Telegram Channels**: The bot must be an admin in all required channels (e.g., `@Turkmen_Shadowsocks`, `@ubuntu24lts`, `@vitalityOfMerdanUSA`).
- **Writable Directory**: Ensure the project directory is writable for `channels.json`.

## Installation
1. **Clone or Create Project Directory**:
   ```bash
   mkdir telegram-bot
   cd telegram-bot
   npm init -y
   ```

2. **Install Dependencies**:
   ```bash
   npm install telegraf axios dotenv winston
   ```

3. **Project Structure**:
   Ensure the following files are in the project directory:
   ```
   telegram-bot/
   ├── index.js
   ├── vpnSponsor.js
   ├── .env
   ├── package.json
   └── channels.json (auto-created on first /admin command)
   ```

4. **Add Source Files**:
   - Copy `index.js` and `vpnSponsor.js` from the provided code (see [Usage](#usage) for details).
   - Create `.env` with the following content:
     ```env
     TELEGRAM_BOT_TOKEN=your_telegram_bot_token
     ADMIN_PASSWORD=merdan1201
     ```

## Configuration
1. **Obtain Bot Token**:
   - Open Telegram, message `@BotFather`, and use `/newbot` to create a bot.
   - Copy the provided token and add it to `.env` as `TELEGRAM_BOT_TOKEN`.

2. **Set Admin Password**:
   - Default password is `merdan1201` (in `.env`). Change it to a secure password if needed.

3. **Add Bot to Channels**:
   - For each required channel (e.g., `@Turkmen_Shadowsocks`):
     - Go to channel settings > Administrators > Add Administrator.
     - Search for your bot and grant admin permissions (minimal permissions needed: view members).

4. **Verify Directory Permissions**:
   - Ensure the project directory (e.g., `C:\Users\Qosmio\Desktop\me js\`) is writable for `channels.json`.
   - If permission issues occur, move the project to a directory like `C:\Users\Qosmio\Documents\telegram-bot\`.

## Running the Bot
1. **Start the Bot**:
   ```bash
   node index.js
   ```
   - For development with auto-restart on file changes:
     ```bash
     npm install -g nodemon
     nodemon index.js
     ```

2. **Stop the Bot**:
   - Press `Ctrl+C` in the terminal.

3. **Deploying (Optional)**:
   - Host on free platforms like [Render](https://render.com/) or [Replit](https://replit.com/).
   - Set environment variables (`TELEGRAM_BOT_TOKEN`, `ADMIN_PASSWORD`) in the platform’s dashboard.
   - Ensure the hosting environment supports file writes for `channels.json`.

## Usage
Interact with the bot via Telegram using the following commands:

### Commands
- **/start**:
  - Displays a welcome message with inline buttons for Books and VPN.
  - Example response:
    ```
    👋 Welcome to the Book Advice Bot!
    I can recommend books and provide VPN codes after channel subscriptions.

    Choose an option below:
    [📚 Books] [🌐 VPN]
    ```

- **/book <query>**:
  - Searches for books using the Google Books API.
  - Example: `/book javascript`
  - Response:
    ```
    📚 *Book Recommendations* 📚

    📖 *Eloquent JavaScript*
    ✍️ Authors: Marijn Haverbeke
    ℹ️ Description: A modern introduction to JavaScript...
    🔗 [More Info](https://books.google.com/...)
    ```

- **/vpn**:
  - For non-admins: Requires subscription to all channels in `REQUIRED_CHANNELS`.
  - Example (not subscribed):
    ```
    Please subscribe to the following channels to get a VPN code:

    @Turkmen_Shadowsocks: https://t.me/Turkmen_Shadowsocks
    @ubuntu24lts: https://t.me/ubuntu24lts

    After subscribing, try /vpn again.
    ```
  - Example (subscribed or admin):
    ```
    🌐 *VPN Code* 🌐

    Your code: `VPN-ABC67890`

    Use it to activate your VPN!
    (Granted due to channel subscriptions)
    ```

- **/admin <password> <channels>**:
  - Updates `REQUIRED_CHANNELS` and grants admin status.
  - Example: `/admin merdan1201 ["@Turkmen_Shadowsocks","@ubuntu24lts"]`
  - Response:
    ```
    ✅ You are now an admin! Required channels updated from [] to [@Turkmen_Shadowsocks,@ubuntu24lts]
    ```
  - Saves channels to `channels.json`:
    ```json
    [
      "@Turkmen_Shadowsocks",
      "@ubuntu24lts"
    ]
    ```

- **/help**:
  - Lists all commands.
  - Example:
    ```
    📖 *Book Advice Bot Commands* 📖

    /start - Show welcome message and options
    /book <query> - Search for book recommendations (e.g., /book javascript)
    /vpn - Get a VPN code (requires channel subscriptions)
    /admin <password> <channels> - Update required channels (e.g., /admin merdan1201 ["@channel1","@channel2"])
    /help - Show this message
    ```

### Admin Workflow
1. Set initial channels:
   ```bash
   /admin merdan1201 ["@Turkmen_Shadowsocks","@ubuntu24lts"]
   ```
2. Update channels:
   ```bash
   /admin merdan1201 ["@Turkmen_Shadowsocks","@ubuntu24lts","@vitalityOfMerdanUSA"]
   ```
3. Non-admins must subscribe to all listed channels to use `/vpn`.

## Testing
1. **Setup**:
   - Ensure `index.js`, `vpnSponsor.js`, and `.env` are configured.
   - Add bot as an admin to test channels (e.g., `@Turkmen_Shadowsocks`, `@ubuntu24lts`).

2. **Test Cases**:
   - **/start**:
     - Verify buttons (Books, VPN) appear on mobile and PC.
   - **/book javascript**:
     - Confirm book recommendations are returned.
   - **/admin**:
     - Run: `/admin merdan1201 ["@Turkmen_Shadowsocks","@ubuntu24lts"]`.
     - Check `channels.json` and response.
     - Update: `/admin merdan1201 ["@Turkmen_Shadowsocks","@ubuntu24lts","@vitalityOfMerdanUSA"]`.
     - Verify `channels.json` updates.
   - **/vpn (Non-Admin)**:
     - Use a non-admin Telegram account.
     - Run `/vpn`, confirm channel list (e.g., `@Turkmen_Shadowsocks`, `@ubuntu24lts`).
     - Subscribe to channels, retry `/vpn`, expect VPN code.
     - Test on mobile (iOS/Android) and PC.
   - **/vpn (Admin)**:
     - Run `/vpn` after `/admin`, expect code with `(Granted due to admin status)`.
   - **Persistence**:
     - Restart bot, confirm `/vpn` requires channels from `channels.json`.

3. **Logs**:
   - Check console for:
     - `Loaded channels from channels.json: ...`
     - `Admin ... updated REQUIRED_CHANNELS from ... to ...`
     - `Sending /vpn response to user ...: ...`
     - `User ... subscription check: isSubscribed=...`

## Troubleshooting
- **Empty `REQUIRED_CHANNELS`**:
  - **Symptom**: `/vpn` grants codes without subscriptions.
  - **Fix**:
    - Check logs for `Invalid /admin input` (correct syntax: `/admin merdan1201 ["@channel1","@channel2"]`).
    - Ensure bot is an admin in channels.
    - Verify `channels.json` exists and updates.
    - Check for `Failed to save channels` (move to writable directory).

- **Mobile Text Issues**:
  - **Symptom**: `/vpn` channel list doesn’t display on mobile.
  - **Fix**:
    - Test with updated `index.js` (uses `Markdown` for channel list).
    - Share mobile OS, Telegram version, and screenshot.
    - Try plain text response by removing `parse_mode`.

- **Bot Crashes**:
  - **Symptom**: Crashes on `/vpn` or other commands.
  - **Fix**:
    - Check logs for errors (e.g., `MarkdownV2` parsing).
    - Ensure `escapeMarkdownV2` is applied to all messages.
    - Share full logs.

- **Subscription Check Fails**:
  - **Symptom**: `/vpn` doesn’t recognize subscriptions.
  - **Fix**:
    - Ensure bot is an admin in all channels.
    - Confirm channels are public (private channels require bot/user membership).
    - Check logs for `Failed to check subscription for ...`.

- **Permission Issues**:
  - **Symptom**: `Failed to save channels to channels.json`.
  - **Fix**:
    - Move project to a writable directory (e.g., `C:\Users\Qosmio\Documents\telegram-bot\`).
    - Run `chmod -R u+w .` on Linux/Mac.

## Dependencies
- **telegraf**: ^4.16.3 - Telegram bot framework.
- **axios**: ^1.7.7 - HTTP client for Google Books API.
- **dotenv**: ^16.4.5 - Environment variable management.
- **winston**: ^3.14.2 - Logging library.
- **nodemon** (optional): ^3.1.7 - Development auto-restart.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/new-feature`).
3. Commit changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a pull request.

Please include tests and update this README if new features are added.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Built with 💻 by [Your Name or Handle]. For issues or feature requests, contact via Telegram or open an issue on the repository.