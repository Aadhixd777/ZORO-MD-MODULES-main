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
            
            // Extract text/caption from the quoted message safely, handling images and standard messages
            const quotedMsg = quotedContext.quotedMessage;
            const quotedText = quotedMsg?.conversation || 
                               quotedMsg?.extendedTextMessage?.text || 
                               quotedMsg?.imageMessage?.caption || 
                               quotedMsg?.videoMessage?.caption || 
                               quotedMsg?.documentMessage?.caption || '';

            // Extract YouTube link directly or fallback to searching the message object
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

            if (incomingText === '1') {
                // Audio Download (MP3)
                await sock.sendMessage(chatId, { text: `📥 Downloading Audio (MP3)... Please wait.` }, { quoted: message });

                // Alternative reliable APIs fallback chain
                const apis = [
                    `https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(targetUrl)}`,
                    `https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(targetUrl)}`
                ];

                let dlUrl = null;
                for (let api of apis) {
                    try {
                        const res = await axios.get(api, { timeout: 25000 });
                        dlUrl = res.data?.result?.download?.url || res.data?.result?.url || res.data?.data?.dl;
                        if (dlUrl) break;
                    } catch (e) {
                        continue;
                    }
                }

                if (!dlUrl) {
                    return await sock.sendMessage(chatId, { text: "❌ Audio download failed. All APIs are currently busy. Try again later." }, { quoted: message });
                }

                const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
                const audioBuffer = Buffer.from(audioRes.data);
                
                // Fetch thumbnail for external ad reply
                let thumbBuffer = null;
                try {
                    const searchRes = await yts(targetUrl);
                    const vInfo = searchRes?.videos?.[0];
                    if (vInfo?.thumbnail) {
                        const tRes = await axios.get(vInfo.thumbnail, { responseType: 'arraybuffer', timeout: 8000 });
                        thumbBuffer = Buffer.from(tRes.data);
                    }
                } catch (e) {}

                await sock.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `song.mp3`,
                    ptt: false,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Zoro MD Music Download',
                            body: '🎵 Created by Aadhi XD',
                            thumbnail: thumbBuffer,
                            mediaType: 1,
                            sourceUrl: targetUrl,
                            showAdAttribution: true
                        }
                    }
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                return;

            } else if (incomingText === '2') {
                // Video Download (MP4)
                await sock.sendMessage(chatId, { text: `📥 Downloading Video (MP4)... Please wait.` }, { quoted: message });

                const videoApis = [
                    `https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(targetUrl)}`,
                    `https://deliriussapi-oficial.vercel.app/download/ytmp4?url=${encodeURIComponent(targetUrl)}`
                ];

                let videoDlUrl = null;
                for (let api of videoApis) {
                    try {
                        const res = await axios.get(api, { timeout: 25000 });
                        videoDlUrl = res.data?.result?.download?.url || res.data?.result?.url || res.data?.data?.dl;
                        if (videoDlUrl) break;
                    } catch (e) {
                        continue;
                    }
                }

                if (!videoDlUrl) {
                    return await sock.sendMessage(chatId, { text: "❌ Video download failed. All APIs are currently busy. Try again later." }, { quoted: message });
                }

                await sock.sendMessage(chatId, {
                    video: { url: videoDlUrl },
                    mimetype: 'video/mp4',
                    caption: `🎬 *Downloaded via Zoro MD*\n✨ *Created by Aadhi XD*`,
                    fileName: `video.mp4`
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
