const yts = require('yt-search');
const axios = require('axios');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         message.message?.imageMessage?.caption || '';
        const incomingText = fullText.trim();
        
        const quotedContext = message.message?.extendedTextMessage?.contextInfo;
        
        if (quotedContext && (incomingText === '1' || incomingText === '2')) {
            await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
            
            const quotedMsg = quotedContext.quotedMessage;
            const quotedText = quotedMsg?.conversation || 
                               quotedMsg?.extendedTextMessage?.text || 
                               quotedMsg?.imageMessage?.caption || 
                               quotedMsg?.videoMessage?.caption || 
                               quotedMsg?.documentMessage?.caption || '';

            let targetUrl = null;
            const linkMatch = quotedText.match(/(https?:\/\/[^\s]+)/);
            if (linkMatch) {
                targetUrl = linkMatch[0];
            } else {
                const stringifiedMsg = JSON.stringify(quotedMsg);
                const fallbackMatch = stringifiedMsg.match(/(https?:\/\/[^\s"']+(?:youtube\.com|youtu\.be)[^\s"']*)/);
                targetUrl = fallbackMatch ? fallbackMatch[0] : null;
            }

            if (!targetUrl) {
                return await sock.sendMessage(chatId, { text: "❌ Session expired or link not found! Please search again using .song <name>" }, { quoted: message });
            }

            function getYouTubeId(url) {
                const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                return match ? match[1] : null;
            }

            const videoId = getYouTubeId(targetUrl);
            if (!videoId) {
                return await sock.sendMessage(chatId, { text: "❌ Invalid YouTube URL!" }, { quoted: message });
            }

            const RAPID_API_KEY = '4f5e43490dmsh311853f1f007189p1b087fjsn70e285235096'; 
            const RAPID_API_HOST = 'yt-search-and-download-mp3.p.rapidapi.com';

            if (incomingText === '1') {
                await sock.sendMessage(chatId, { text: `📥 Downloading Audio (MP3)... Please wait.` }, { quoted: message });

                let dlUrl = null;
                try {
                    const response = await axios.get(`https://${RAPID_API_HOST}/mp3`, {
                        params: { id: videoId, url: targetUrl },
                        headers: {
                            'X-RapidAPI-Key': RAPID_API_KEY,
                            'X-RapidAPI-Host': RAPID_API_HOST
                        },
                        timeout: 25000
                    });
                    dlUrl = response.data?.link || response.data?.download || response.data?.url || response.data?.dl;
                } catch (e) {
                    console.error('RapidAPI Error:', e.message);
                }

                if (!dlUrl) {
                    return await sock.sendMessage(chatId, { text: "❌ Audio download failed from RapidAPI." }, { quoted: message });
                }

                const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
                const audioBuffer = Buffer.from(audioRes.data);

                await sock.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `song.mp3`,
                    ptt: false
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                return;

            } else if (incomingText === '2') {
                await sock.sendMessage(chatId, { text: `📥 Downloading Video (MP4)... Please wait.` }, { quoted: message });

                let videoDlUrl = null;
                try {
                    const response = await axios.get(`https://${RAPID_API_HOST}/mp3`, {
                        params: { id: videoId, url: targetUrl, format: 'mp4' },
                        headers: {
                            'X-RapidAPI-Key': RAPID_API_KEY,
                            'X-RapidAPI-Host': RAPID_API_HOST
                        },
                        timeout: 25000
                    });
                    videoDlUrl = response.data?.link || response.data?.download || response.data?.url || response.data?.dl;
                } catch (e) {
                    console.error('Video API Error:', e.message);
                }

                if (!videoDlUrl) {
                    return await sock.sendMessage(chatId, { text: "❌ Video download failed." }, { quoted: message });
                }

                await sock.sendMessage(chatId, {
                    video: { url: videoDlUrl },
                    mimetype: 'video/mp4',
                    caption: `🎬 *Downloaded via Zoro MD*\n✨ *Created by Aadhixd*`,
                    fileName: `video.mp4`
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                return;
            }
        }

        const queryText = fullText.split(' ').slice(1).join(' ').trim();
        if (!queryText) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *𝗭𝗢𝗥𝗢-𝗠𝗗 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        const searchResults = await yts(queryText);
        const video = searchResults?.videos?.[0];

        if (!video) {
            return await sock.sendMessage(chatId, { text: "❌ *Oops!* No results found on YouTube!" }, { quoted: message });
        }

        let thumbBuffer = null;
        let imageToUse = null;
        
        try {
            if (video.thumbnail) {
                const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 8000 });
                thumbBuffer = Buffer.from(thumbRes.data);
                imageToUse = thumbBuffer;
            }
        } catch (e) {}

        const vidmateMenuText = `┌  📥 *𝗭𝗢𝗥𝗢-𝗠𝗗 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥* 📥
│
├  🎬 *Title:* ${video.title}
├  ⏱️ *Duration:* ${video.timestamp}
├  👀 *Views:* ${video.views}
├  🔗 *Link:* ${video.url}
│
---------------------------------------
│  👇 *Reply to this message with:*
│  *1️⃣* 🎵 Audio (MP3 Format)
│  *2️⃣* 🎥 Video (MP4 Format)
└─────────────────────────────────────
│  𝗢𝘄𝗻𝗲𝗿 & 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗱 𝗯𝘆 👑 𝗔𝗮𝗱𝗵𝗶𝘅𝗱 ⚡
└─────────────────────────────────────`;

        if (imageToUse) {
            await sock.sendMessage(chatId, {
                image: imageToUse,
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
