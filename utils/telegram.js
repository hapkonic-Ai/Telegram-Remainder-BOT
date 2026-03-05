const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

async function sendMessage(chatId, text) {
    if (!TELEGRAM_TOKEN) {
        console.error('TELEGRAM_TOKEN is not set');
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to send message to ${chatId}: ${errorText}`);
        }
    } catch (error) {
        console.error(`Error sending message: ${error.message}`);
    }
}

module.exports = { sendMessage };
