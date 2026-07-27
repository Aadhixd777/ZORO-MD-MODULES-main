const yts = require('yt-search');
const axios = require('axios');

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const text = fullText.split(' ').slice(1).join(' ').trim();

        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *ZORO-MD MUSIC* ⭐\n\n❌ Provide song name or YouTube URL!\n💡 Example: .song Faded' 
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
            if (text.includes('youtube.com') || text.includes('youtu.be')) {
                const search = await yts(text);
                video = search.videos[0] || search;
            } else {
                const search = await yts(text);
                if (!search.videos || search.videos.length === 0) {
                    return await sock.sendMessage(chatId, { text: "❌ No songs found!" }, { quoted: message });
                }
                video = search.videos[0];
            }
        } catch (e) {
            console.log('yt-search failed:', e.message);
            return await sock.sendMessage(chatId, { text: `❌ Search failed: ${e.message}` }, { quoted: message });
        }

        try {
            if (processingMsg) {
                await sock.sendMessage(chatId, { 
                    text: `🎵 *ZORO-MD MUSIC* 🎵\n\n📝 Title: ${video.title}\n⏱️ Duration: ${video.timestamp || 'N/A'}\n📥 Downloading...`,
                }, { quoted: message });
            }
        } catch {}

        let audioBuffer = null;

        const downloadApis = [
            `https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(video.url)}`
        ];

        // API 1
        try {
            console.log('Trying API 1...');
            const res = await axios.get(downloadApis[0], { timeout: 20000 });
            const downloadUrl = res.data?.result?.download?.url || res.data?.result?.url || res.data?.url;
            if (downloadUrl) {
                const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                audioBuffer = Buffer.from(audioRes.data);
                console.log('✅ API 1 Success');
            }
        } catch (e) {
            console.log('API 1 failed:', e.message);
        }

        // API 2: Fallback
        if (!audioBuffer) {
            try {
                console.log('Trying API 2...');
                const res = await axios.get(downloadApis[1], { timeout: 20000 });
                const downloadUrl = res.data?.data?.downloadUrl || res.data?.result?.downloadUrl || res.data?.data?.url;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ API 2 Success');
                }
            } catch (e) {
                console.log('API 2 failed:', e.message);
            }
        }

        // API 3: Fallback
        if (!audioBuffer) {
            try {
                console.log('Trying API 3...');
                const res = await axios.get(downloadApis[2], { timeout: 20000 });
                const downloadUrl = res.data?.result?.downloadUrl || res.data?.result?.audio;
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
                text: `❌ *Download Failed*\n\nTitle: ${video.title}\n\nAll download servers are currently busy. Please try again!` 
            }, { quoted: message });
        }

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
                body: `Duration: ${video.timestamp || 'N/A'} | ZORO MD`,
                thumbnail: thumbBuffer,
                mediaType: 1,
                sourceUrl: video.url,
                showAdAttribution: true
            }
        };

        console.log(`🚀 Sending audio: ${video.title}`);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: adReplyContext
        }, { quoted: message });

        await sock.sendMessage(chatId, { 
            text: `✅ *ZORO-MD DELIVERED* ✅\n\n🎶 *${video.title}*\n⏱️ ${video.timestamp || 'N/A'}\n🔗 ${video.url}` 
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
