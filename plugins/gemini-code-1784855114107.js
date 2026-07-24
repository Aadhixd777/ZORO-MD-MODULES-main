const yts = require('yt-search');
const axios = require('axios');

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

        try {
            if (processingMsg) {
                await sock.sendMessage(chatId, { 
                    text: `🎵 *ZORO-MD MUSIC* 🎵\n\n📝 Title: ${video.title}\n⏱️ Duration: ${video.timestamp}\n📥 Downloading...`,
                }, { quoted: message });
            }
        } catch {}

        let audioBuffer = null;

        // 🔥 MULTI-API FALLBACK SYSTEM (Bypasses YouTube Blocks)
        const apis = [
            `https://api.cobalt.tools/api/json`,
            `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.guruapi.tech/ytmp3?url=${encodeURIComponent(video.url)}`
        ];

        // API Method 1: Cobalt Engine (High-Speed & Working)
        try {
            console.log('Trying API 1 (Cobalt)...');
            const res = await axios.post('https://api.cobalt.tools/api/json', {
                url: video.url,
                downloadMode: 'audio',
                audioFormat: 'mp3'
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 20000
            });

            if (res.data && res.data.url) {
                const audioRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 60000 });
                audioBuffer = Buffer.from(audioRes.data);
                console.log('✅ API 1 Success');
            }
        } catch (e) {
            console.log('API 1 failed:', e.message);
        }

        // API Method 2 (Fallback)
        if (!audioBuffer) {
            try {
                console.log('Trying API 2...');
                const res = await axios.get(apis[1], { timeout: 25000 });
                const downloadUrl = res.data?.result?.download_url || res.data?.url || res.data?.result?.url;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ API 2 Success');
                }
            } catch (e) {
                console.log('API 2 failed:', e.message);
            }
        }

        // API Method 3 (Fallback)
        if (!audioBuffer) {
            try {
                console.log('Trying API 3...');
                const res = await axios.get(apis[2], { timeout: 25000 });
                const downloadUrl = res.data?.result?.downloadUrl || res.data?.downloadUrl || res.data?.result;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ API 3 Success');
                }
            } catch (e) {
                console.log('API 3 failed:', e.message);
            }
        }

        if (!audioBuffer) {
            return await sock.sendMessage(chatId, { 
                text: `❌ *Download Failed*\n\nTitle: ${video.title}\n\nAll download servers are currently busy. Please try again in a few minutes!` 
            }, { quoted: message });
        }

        // Size Limit check - Max 15MB
        if (audioBuffer.length > 15 * 1024 * 1024) {
            return await sock.sendMessage(chatId, { 
                text: `❌ File too large (${(audioBuffer.length/1024/1024).toFixed(2)} MB)\nMax 15MB allowed for WhatsApp. Try a shorter song!` 
            }, { quoted: message });
        }

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

        console.log(`🚀 Sending audio: ${video.title}`);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: false,
            contextInfo: adReplyContext
        }, { quoted: message });

        await sock.sendMessage(chatId, { 
            text: `✅ *ZORO-MD DELIVERED* ✅\n\n🎶 *${video.title}*\n⏱️ ${video.timestamp}\n👁️ ${video.views} views\n🔗 ${video.url}` 
        }, { quoted: message });
        
        try { await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } }); } catch {}

    } catch (err) {
        console.error('Song Error:', err.message);
        try {
            await sock.sendMessage(chatId, { text: `❌ Error: ${err.message}\nTry again!` }, { quoted: message });
        } catch {}
    }
}

module.exports = songCommand;