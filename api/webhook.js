const { connectToDatabase, User, Reminder } = require('../utils/db');
const { sendMessage } = require('../utils/telegram');
const chrono = require('chrono-node');
const moment = require('moment-timezone');

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { body } = req;

        // Sometimes Telegram sends edited_message or other things, 
        // we only care about regular messages for now.
        const messageObj = body.message;
        if (!messageObj) {
            return res.status(200).send('No message found');
        }

        const chatId = messageObj.chat.id;
        const text = messageObj.text || '';

        // Connect DB
        await connectToDatabase();

        // Upsert User
        let user = await User.findOne({ chatId });
        if (!user) {
            user = await User.create({ chatId });
        }

        // 1. /start command
        if (text.startsWith('/start')) {
            await sendMessage(chatId, "Welcome! I am your Reminder Bot. \n\nUse `/remind [time] [message]` to set a reminder. \nExample: `/remind tomorrow 6pm drink water`.\n\nUse `/timezone [Region/City]` to set your timezone. \nExample: `/timezone America/New_York`.");
            return res.status(200).send('OK');
        }

        // 1b. /timezone command
        if (text.startsWith('/timezone')) {
            const inputZone = text.substring(9).trim();
            if (!inputZone) {
                await sendMessage(chatId, `Your current timezone is ${user.timezone}.\n\nTo change it, use \`/timezone Region/City\`\n(e.g., \`/timezone Europe/London\`)`);
                return res.status(200).send('OK');
            }

            if (moment.tz.zone(inputZone)) {
                user.timezone = inputZone;
                await user.save();
                await sendMessage(chatId, `Timezone successfully updated to ${inputZone} ✅`);
            } else {
                await sendMessage(chatId, "Invalid timezone. Please use the Region/City format (e.g., `Asia/Kolkata`, `America/New_York`).");
            }
            return res.status(200).send('OK');
        }

        // 2. /remind command
        if (text.startsWith('/remind')) {
            // Remove '/remind' from the start
            const input = text.substring(7).trim();

            if (!input) {
                await sendMessage(chatId, "Please specify a time and a message. \nExample: `/remind tomorrow 9am call mom`");
                return res.status(200).send('OK');
            }

            // We spoof the system's Date object so that `chrono` evaluates relative terms 
            // ("today", "tomorrow", "monday") against the user's current local calendar day.
            const nowInUserTZ = moment().tz(user.timezone);
            const fakeSystemDateStr = nowInUserTZ.format('YYYY-MM-DDTHH:mm:ss');
            const fakeSystemDate = new Date(fakeSystemDateStr);

            // Parse date/time with chrono relative to the spoofed Date
            const parsedResults = chrono.parse(input, fakeSystemDate, { forwardDate: true });

            if (parsedResults.length === 0) {
                await sendMessage(chatId, "I couldn't understand the time. Try something like 'tomorrow 5pm' or 'in 2 hours'.");
                return res.status(200).send('OK');
            }

            const parsedDateObj = parsedResults[0];
            const start = parsedDateObj.start;

            let dueTime;
            if (start.isCertain('timezoneOffset')) {
                // If the user provided an explicit timezone (e.g., "12 PM EST"), then chrono's absolute Date is correct
                dueTime = start.date();
            } else {
                // Map the parsed time primitives to the user's timezone implicitly
                const year = start.get('year') || nowInUserTZ.year();
                const month = start.get('month') || (nowInUserTZ.month() + 1);
                const day = start.get('day') || nowInUserTZ.date();
                const hour = start.get('hour') || 0;
                const minute = start.get('minute') || 0;
                const second = start.get('second') || 0;
                const millisecond = start.get('millisecond') || 0;

                const correctMoment = moment.tz({
                    year, month: month - 1, date: day, hour, minute, second, millisecond
                }, user.timezone);

                dueTime = correctMoment.toDate(); // Correct global UTC absolute time
            }

            // The text AFTER the parsed time date
            // "tomorrow 5pm buy milk" -> the parsed text is "tomorrow 5pm", leaving " buy milk"
            const timeStrIndex = input.indexOf(parsedDateObj.text);
            const reminderTextRaw = input.slice(0, timeStrIndex) + input.slice(timeStrIndex + parsedDateObj.text.length);
            const reminderText = reminderTextRaw.trim();

            if (!reminderText) {
                await sendMessage(chatId, "I got the time, but what do you want me to remind you about?");
                return res.status(200).send('OK');
            }

            // Save to DB
            await Reminder.create({
                chatId: chatId,
                message: reminderText,
                dueTime: dueTime,
            });

            // Format response according to user timezone
            const formattedTime = moment(dueTime).tz(user.timezone).format('dddd, MMM D, YYYY [at] h:mm A z');

            await sendMessage(chatId, `Reminder saved ✅\n\nI will remind you to "${reminderText}" on ${formattedTime}.`);
            return res.status(200).send('OK');
        }

        // Unknown commands
        await sendMessage(chatId, "I didn't understand that. Use `/remind [time] [message]`.");
        res.status(200).send('OK');

    } catch (error) {
        console.error("Webhook Error:", error);
        // Even on error, we send 200 so Telegram stops retrying the bad hook continuously 
        res.status(200).send('Internal Server Error handled');
    }
}
