const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const text = fullText.split(' ').slice(1).join(' ').trim();

        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        let processingMsg = await sock.sendMessage(chatId, { 
            text: `🔍 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐒𝐄𝐀𝐑𝐂𝐇𝐈𝐍𝐆* 🔍\n\n» *Query:* \`${text}\`\n» *Status:* Searching on YouTube...` 
        }, { quoted: message });

        const searchResults = await yts(text);
        const videos = searchResults?.videos;
        
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *Oops!* No songs found matching your query." 
            }, { quoted: message });
        }
        
        const video = videos[0];

        await sock.sendMessage(chatId, { 
            text: `🎵 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* 🎵\n\n📝 *Title:* ${video.title}\n📥 *Status:* Downloading audio stream...`,
            edit: processingMsg.key
        });

        const stream = ytdl(video.url, { 
            filter: 'audioonly', 
            quality: 'highestaudio',
            highWaterMark: 1 << 25 
        });
        
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        await sock.sendMessage(chatId, { 
            text: `🚀 *𝐙𝐎𝐑𝐎-𝐌𝐃 UPLOADING* 🚀\n\n» *Song:* ${video.title}\n» *Status:* Pushing audio to chat...`,
            edit: processingMsg.key
        });

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { 
            text: `✅ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐃𝐄𝐋𝐈𝐕𝐄𝐑𝐄𝐃* ✅\n\n🎶 *${video.title}*`, 
            edit: processingMsg.key 
        });
        
        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Song Error:', err);
        try {
            await sock.sendMessage(chatId, { 
                text: `❌ *Error:* Could not process this song download. Please try again later.` 
            }, { quoted: message });
        } catch (secondaryErr) {
            console.error('Failed to send error message:', secondaryErr);
        }
    }
}

module.exports = songCommand;
