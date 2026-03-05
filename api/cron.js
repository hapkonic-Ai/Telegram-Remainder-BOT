const { connectToDatabase, Reminder } = require('../utils/db');
const { sendMessage } = require('../utils/telegram');

export default async function handler(req, res) {
    // Only allow GET for cron
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    // Security check: Only allow Vercel Cron to hit this route
    // The header 'x-vercel-cron' is injected by Vercel
    // You can also check process.env.CRON_SECRET if you set one up.
    if (process.env.NODE_ENV === 'production') {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        await connectToDatabase();

        // Find all reminders where dueTime is in the past AND isSent is false
        const now = new Date();
        const dueReminders = await Reminder.find({
            dueTime: { $lte: now },
            isSent: false
        });

        if (dueReminders.length === 0) {
            return res.status(200).json({ message: 'No due reminders' });
        }

        let sentCount = 0;

        for (const reminder of dueReminders) {
            try {
                await sendMessage(reminder.chatId, `⏰ ${reminder.message}`);

                // Mark as sent
                reminder.isSent = true;
                await reminder.save();

                sentCount++;
            } catch (err) {
                console.error(`Failed to process reminder ${reminder._id}:`, err);
            }
        }

        res.status(200).json({ message: `Successfully sent ${sentCount} reminders`, total: sentCount });

    } catch (error) {
        console.error("Cron Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
