const yts = require('yt-search');
const axios = require('axios');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || '';
        const incomingText = fullText.trim();
        
        // Check if the user replied to a message
        const quotedContext = message.message?.extendedTextMessage?.contextInfo;
        
        if (quotedContext && (incomingText === '1' || incomingText === '2')) {
            await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
            
            // Extract the title or query from the quoted message text/caption
            const quotedText = quotedContext.quotedMessage?.conversation || quotedContext.quotedMessage?.extendedTextMessage?.text || quotedContext.quotedMessage?.imageMessage?.caption || '';
            
            let targetQuery = "";
            const match = quotedText.match(/🎬 \*Title:\* (.+)/);
            if (match && match[1]) {
                targetQuery = match[1].split('\n')[0].trim();
            }

            if (!targetQuery) {
                return await sock.sendMessage(chatId, { text: "❌ Session expired or title not found! Please search again using .song <name>" }, { quoted: message });
            }

            const searchResults = await yts(targetQuery);
            const video = searchResults?.videos?.[0];

            if (!video || !video.url) {
                return await sock.sendMessage(chatId, { text: "❌ Could not find the media to download!" }, { quoted: message });
            }

            let thumbBuffer = null;
            try {
                if (video.thumbnail) {
                    const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 8000 });
                    thumbBuffer = Buffer.from(thumbRes.data);
                }
            } catch (e) {}

            if (incomingText === '1') {
                // Audio Download (MP3)
                await sock.sendMessage(chatId, { text: `📥 Downloading Audio (MP3) for *${video.title}*... Please wait.` }, { quoted: message });

                const downloadApi = `https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(video.url)}`;
                let dlUrl = null;
                try {
                    const res = await axios.get(downloadApi, { timeout: 20000 });
                    dlUrl = res.data?.result?.download?.url || res.data?.result?.url;
                } catch (e) {}

                if (!dlUrl) {
                    return await sock.sendMessage(chatId, { text: "❌ Audio download failed. Please try again." }, { quoted: message });
                }

                const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 50000 });
                const audioBuffer = Buffer.from(audioRes.data);

                const safeTitle = (video.title || 'song').replace(/[\\/:*?"<>|]/g, '');
                
                await sock.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false,
                    contextInfo: {
                        externalAdReply: {
                            title: video.title.substring(0, 60),
                            body: `🎵 Duration: ${video.timestamp} | Created by Aadhi XD`,
                            thumbnail: thumbBuffer,
                            mediaType: 1,
                            sourceUrl: video.url,
                            showAdAttribution: true
                        }
                    }
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                return;

            } else if (incomingText === '2') {
                // Video Download (MP4)
                await sock.sendMessage(chatId, { text: `📥 Downloading Video (MP4) for *${video.title}*... Please wait.` }, { quoted: message });

                const videoApi = `https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(video.url)}`;
                let videoDlUrl = null;
                try {
                    const res = await axios.get(videoApi, { timeout: 20000 });
                    videoDlUrl = res.data?.result?.download?.url || res.data?.result?.url;
                } catch (e) {}

                if (!videoDlUrl) {
                    return await sock.sendMessage(chatId, { text: "❌ Video download failed. Please try again." }, { quoted: message });
                }

                const safeTitle = (video.title || 'video').replace(/[\\/:*?"<>|]/g, '');
                
                await sock.sendMessage(chatId, {
                    video: { url: videoDlUrl },
                    mimetype: 'video/mp4',
                    caption: `🎬 *${video.title}*\n⏱️ *Duration:* ${video.timestamp}\n\n✨ *Created by Aadhi XD*`,
                    fileName: `${safeTitle}.mp4`
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                return;
            }
        }

        // Initial Search Flow (.song <name>)
        const queryText = fullText.split(' ').slice(1).join(' ').trim();
        if (!queryText) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *𝐙𝐎𝐑𝐎-𝐌𝐃 VIDMATE DOWNLOADER* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        const searchResults = await yts(queryText);
        const video = searchResults?.videos?.[0];

        if (!video) {
            return await sock.sendMessage(chatId, { text: "❌ *Oops!* No results found on YouTube!" }, { quoted: message });
        }

        let thumbBuffer = null;
        try {
            if (video.thumbnail) {
                const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 8000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            }
        } catch (e) {}

        const vidmateMenuText = `📥 *𝐙𝐎𝐑𝐎-𝐌𝐃 VIDMATE DOWNLOADER* 📥
        
🎬 *Title:* ${video.title}
⏱️ *Duration:* ${video.timestamp}
👀 *Views:* ${video.views}
🔗 *Link:* ${video.url}

---------------------------------------
👇 *Reply to this message with:*
*1️⃣* 🎵 Audio (MP3 Format)
*2️⃣* 🎥 Video (MP4 Format)
---------------------------------------
✨ *Created by Aadhi XD*`;

        if (thumbBuffer) {
            await sock.sendMessage(chatId, {
                image: thumbBuffer,
                caption: vidmateMenuText
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: vidmateMenuText }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('VidMate Style Error:', err.message);
        await sock.sendMessage(chatId, { text: `❌ *Error:* Failed to process VidMate request.` }, { quoted: message });
    }
}

module.exports = songCommand;
