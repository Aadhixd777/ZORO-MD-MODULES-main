const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

async function songCommand(sock, chatId, message) {
    let tempFilePath = null;
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const text = fullText.split(' ').slice(1).join(' ');

        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        let processingMsg = await sock.sendMessage(chatId, { 
            text: `🔍 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐒𝐄𝐀𝐑𝐂𝐇𝐈𝐍𝐆* 🔍\n\n» *Query:* \`${text}\`\n» *Status:* 📡 Connecting to YouTube...` 
        }, { quoted: message });

        const { videos } = await yts(text);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: "❌ *Oops!* No songs found!" }, { quoted: message });
        }
        
        const video = videos[0];

        await sock.sendMessage(chatId, { 
            text: `🎵 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* 🎵\n\n📝 *Title:* ${video.title}\n📥 *Status:* ⚡ Downloading via yt-dlp...`,
            edit: processingMsg.key
        });

        // Unique temp file path for downloading audio securely
        tempFilePath = path.join(__dirname, `temp_${Date.now()}.mp3`);

        // Using youtube-dl-exec (yt-dlp wrapper) for robust extraction
        await youtubedl(video.url, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: tempFilePath,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        if (!fs.existsSync(tempFilePath)) {
            throw new Error('Audio extraction failed.');
        }

        const audioBuffer = fs.readFileSync(tempFilePath);

        await sock.sendMessage(chatId, { 
            text: `🚀 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐔𝐏𝐋𝐎𝐀𝐃𝐈𝐍𝐆* 🚀\n\n» *Song:* ${video.title}\n» *Status:* 📤 Pushing audio to chat...`,
            edit: processingMsg.key
        });

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { 
            text: `✅ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐃𝐄ЛИВЕРЕD* ✅\n\n🎶 *${video.title}*`, 
            edit: processingMsg.key 
        });
        
        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Song Error:', err.message);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Error:* Could not download this song. Please try again.` }, { quoted: message });
        } catch (e) {}
    } finally {
        // Clean up temp file safely
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
    }
}

module.exports = songCommand;
