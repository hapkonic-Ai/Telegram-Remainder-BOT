# Telegram Reminder Bot

A powerful serverless Telegram bot built with Node.js, hosted on Vercel, and powered by MongoDB. It allows users to schedule reminders using natural language (e.g., "tomorrow 7pm drink water") and supports global timezones.

## Features
- **Natural Language Parsing**: Uses `chrono-node` to understand times and dates instinctively.
- **Timezone Aware**: Users can set their local timezone and receive reminders precisely when they expect them.
- **Serverless Architecture**: Runs entirely on Vercel API routes using Webhooks.
- **External Cron Validation**: Designed to work with free cron services like cron-job.org.
- **MongoDB Storage**: Stores user preferences and pending reminders safely in a NoSQL database.

## Prerequisites
- A Telegram Bot Token from [@BotFather](https://t.me/botfather)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection URI
- A [Vercel](https://vercel.com/) account for hosting

## Setup Instructions

### 1. Configure the Environment
If running locally, create a `.env` file in the root directory:
```env
TELEGRAM_TOKEN=your_telegram_bot_token_here
MONGODB_URI=your_mongodb_connection_string_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Vercel Deployment
1. Import this repository into Vercel.
2. In the deployment settings, add the `TELEGRAM_TOKEN` and `MONGODB_URI` environment variables.
3. Deploy the project.

### 4. Setup Telegram Webhook
Once Vercel provides your production URL (e.g., `https://your-bot-domain.vercel.app`), register it with Telegram by opening this URL in your browser:

```
https://api.telegram.org/bot<YOUR_TELEGRAM_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/webhook
```

### 5. Setup External Cron Service
Vercel's free tier limits cron jobs to 1 per day. To run this bot effectively, use a free service like cron-job.org:
1. Create a free account at [cron-job.org](https://cron-job.org).
2. Create a new Cronjob targeting your URL: `https://<YOUR_VERCEL_DOMAIN>/api/cron`
3. Set the execution schedule to **Every 1 minute**.
*(This service will ping your bot every minute to check for and dispatch any due reminders).*

## Commands
Interact with your bot on Telegram using these commands:
- `/start` - Start the bot and get instructions.
- `/timezone Region/City` - Set your local timezone (e.g., `/timezone America/New_York`).
- `/remind [time] [message]` - Create a new reminder (e.g., `/remind in 2 hours check the oven`).

## Architecture
- `api/webhook.js` - Endpoint that Telegram hits whenever a user sends a message. It parses the command, understands the time context via `chrono-node`, and saves the reminder to MongoDB.
- `api/cron.js` - An API endpoint meant to be pinged every minute by an external service to check the database for any due reminders and send them out.

## License
MIT
