const yts = require('yt-search');
const ytdl = require('ytdl-core');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const text = fullText.split(' ').slice(1).join(' ');

        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
            }, { quoted: message });
        }

        // 1. Mass reaction (Lightning!)
        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        // 2. Processing message
        let processingMsg = await sock.sendMessage(chatId, { 
            text: `🔍 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐒𝐄𝐀𝐑𝐂𝐇𝐈𝐍𝐆* 🔍\n\n» *Query:* \`${text}\`\n» *Status:* 📡 Connecting to YouTube...\n\n_⏳ Please wait a moment..._` 
        }, { quoted: message });

        const { videos } = await yts(text);
        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            return await sock.sendMessage(chatId, { text: "❌ *Oops!* No songs found!" }, { quoted: message });
        }
        
        const video = videos[0];
        const duration = video.timestamp || 'Unknown';
        const views = video.views ? video.views.toLocaleString() : 'Unknown';

        // 3. Info card
        await sock.sendMessage(chatId, { 
            text: `🎵 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐅𝐎𝐔𝐍𝐃* 🎵\n\n📝 *Title:* ${video.title}\n⏱️ *Duration:* ${duration}\n👁️ *Views:* ${views}\n🎬 *Channel:* ${video.author.name}\n\n📥 *Status:* ⚡ Downloading directly...`,
            edit: processingMsg.key
        });

        // Direct Download using ytdl-core
        const stream = ytdl(video.url, { 
            filter: 'audioonly', 
            quality: 'highestaudio' 
        });
        
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        // 4. Uploading status
        await sock.sendMessage(chatId, { 
            text: `🚀 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐔𝐏𝐋𝐎𝐀𝐃𝐈𝐍𝐆* 🚀\n\n» *Song:* ${video.title}\n» *Status:* 📤 Pushing audio to chat...`,
            edit: processingMsg.key
        });

        // 5. Send the audio player
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: message });

        // 6. Final success message
        await sock.sendMessage(chatId, { 
            text: `✅ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐃𝐄𝐋𝐈𝐕𝐄𝐑𝐄𝐃* ✅\n\n🎶 *${video.title}*\n✨ Enjoy your music, master!`, 
            edit: processingMsg.key 
        });
        
        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Song Error:', err.message);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Error:* ${err.message}` }, { quoted: message });
        } catch (e) {}
    }
}

module.exports = songCommand;
