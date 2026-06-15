const yts = require('yt-search');
const axios = require('axios');

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

        // 2. Processing message (Hacker Style)
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

        // 3. Info card showing full song details
        await sock.sendMessage(chatId, { 
            text: `🎵 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐅𝐎𝐔𝐍𝐃* 🎵\n\n📝 *Title:* ${video.title}\n⏱️ *Duration:* ${duration}\n👁️ *Views:* ${views}\n🎬 *Channel:* ${video.author.name}\n\n📥 *Status:* ⚡ Downloading file from server...`,
            edit: processingMsg.key
        });

        const apiUrls = [
            `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(video.url)}`
        ];

        let audioBuffer = null;

        for (let url of apiUrls) {
            try {
                const res = await axios.get(url);
                const downloadUrl = res.data.audio || res.data.result?.download || res.data.url;
                
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { 
                        responseType: 'arraybuffer',
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    
                    if (audioRes.data.byteLength > 100000) {
                        audioBuffer = Buffer.from(audioRes.data);
                        break; 
                    }
                }
            } catch (e) {
                console.log("API Failed, trying next backup...");
            }
        }

        if (!audioBuffer) {
            throw new Error("None of the download servers are responding.");
        }

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

        // 6. Final success message (Royal finishing!)
        await sock.sendMessage(chatId, { 
            text: `✅ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐃𝐄𝐋𝐈𝐕𝐄𝐑𝐄𝐃* ✅\n\n🎶 *${video.title}*\n✨ Enjoy your music, master!`, 
            edit: processingMsg.key 
        });
        
        // Crown reaction for the boss!
        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Song Error:', err.message);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Error:* ${err.message}` }, { quoted: message });
        } catch (e) {}
    }
}

module.exports = songCommand;
