
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const text = fullText.split(' ').slice(1).join(' ').trim();

        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *ZORO-MD MUSIC* ⭐\n\n❌ Provide song name!\n💡 Example: .song Faded' 
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } }); } catch {}

        let processingMsg = null;
        try {
            processingMsg = await sock.sendMessage(chatId, { 
                text: `🔍 *ZORO-MD SEARCHING* 🔍\n\n» Query: ${text}\n» Status: 📡 Searching YouTube...` 
            }, { quoted: message });
        } catch (e) {}

        console.log(`🎵 Searching: ${text}`);
        let video;
        try {
            const search = await yts(text);
            if (!search.videos || search.videos.length === 0) {
                return await sock.sendMessage(chatId, { text: "❌ No songs found!" }, { quoted: message });
            }
            video = search.videos[0];
        } catch (e) {
            console.log('yt-search failed:', e.message);
            return await sock.sendMessage(chatId, { text: `❌ Search failed: ${e.message}` }, { quoted: message });
        }

        // Try to edit processing message - safe version
        try {
            if (processingMsg) {
                await sock.sendMessage(chatId, { 
                    text: `🎵 *ZORO-MD MUSIC* 🎵\n\n📝 Title: ${video.title}\n⏱️ Duration: ${video.timestamp}\n📥 Downloading...`,
                }, { quoted: message });
            }
        } catch {}

        let audioBuffer = null;
        let audioTitle = video.title;

        // METHOD 1: Try ytdl-core with bypass
        try {
            console.log('Trying ytdl-core...');
            const ytdl = require('ytdl-core');
            const info = await ytdl.getInfo(video.url);
            const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
            if (format) {
                const response = await axios({
                    url: format.url,
                    method: 'GET',
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.youtube.com/'
                    }
                });
                audioBuffer = Buffer.from(response.data);
                console.log(`✅ ytdl-core success: ${audioBuffer.length} bytes`);
            }
        } catch (e) {
            console.log(`ytdl-core failed: ${e.message}`);
        }

        // METHOD 2: Try external API as fallback (keeps bot alive even if ytdl fails)
        if (!audioBuffer) {
            try {
                console.log('Trying API fallback...');
                // Using a public YT to MP3 API - you can replace with your own
                const apiUrl = `https://api.princetechn.com/api/download/ytmp3?apikey=prince&url=${encodeURIComponent(video.url)}`;
                const res = await axios.get(apiUrl, { timeout: 30000 });
                if (res.data && res.data.result && res.data.result.download_url) {
                    const audioRes = await axios.get(res.data.result.download_url, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ API fallback success');
                }
            } catch (e) {
                console.log('API fallback failed:', e.message);
            }
        }

        if (!audioBuffer) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *Download Failed*\n\nTitle: ${video.title}\n\nYouTube blocking download. Try again later or use another song!\n\nTip: Use small songs < 5 min` 
            }, { quoted: message });
        }

        // Check size - max 15MB for WhatsApp
        if (audioBuffer.length > 15 * 1024 * 1024) {
            return await sock.sendMessage(chatId, { 
                text: `❌ File too large (${(audioBuffer.length/1024/1024).toFixed(2)} MB)\nMax 15MB allowed. Try shorter song!` 
            }, { quoted: message });
        }

        // Thumbnail for audio
        let thumbBuffer = null;
        try {
            if (video.thumbnail) {
                const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            }
        } catch {}

        const adReplyContext = {
            externalAdReply: {
                title: video.title.substring(0, 60),
                body: `Duration: ${video.timestamp} | ZORO MD`,
                thumbnail: thumbBuffer,
                mediaType: 1,
                sourceUrl: video.url,
                showAdAttribution: true
            }
        };

        console.log(`🚀 Sending audio: ${audioTitle}`);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: adReplyContext
        }, { quoted: message });

        await sock.sendMessage(chatId, { 
            text: `✅ *ZORO-MD DELIVERED* ✅\n\n🎶 *${video.title}*\n⏱️ ${video.timestamp}\n👁️ ${video.views} views\n🔗 ${video.url}` 
        }, { quoted: message });
        
        try { await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } }); } catch {}

    } catch (err) {
        console.error('Song Error:', err.message, err.stack);
        try {
            await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}\nTry again!` }, { quoted: message });
        } catch {}
    }
}

module.exports = songCommand;
