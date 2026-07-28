const yts = require('yt-search');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || '';
        const queryText = fullText.split(' ').slice(1).join(' ').trim();

        if (!queryText) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a song name! Example: .song Faded' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        const searchResults = await yts(queryText);
        const video = searchResults?.videos?.[0];

        if (!video) {
            return await sock.sendMessage(chatId, { text: "❌ No songs found!" }, { quoted: message });
        }

        // Send direct YouTube audio link or stream info safely without heavy binaries
        await sock.sendMessage(chatId, {
            text: `🎵 *ZORO-MD MUSIC* 🎵\n\n📝 *Title:* ${video.title}\n⏱️ *Duration:* ${video.timestamp}\n🔗 *Link:* ${video.url}\n\n_Note: Stream loaded successfully via direct search!_`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('Error:', err.message);
        await sock.sendMessage(chatId, { text: "❌ An error occurred." }, { quoted: message });
    }
}

module.exports = songCommand;
