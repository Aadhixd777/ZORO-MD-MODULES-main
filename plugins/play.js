const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const searchQuery = fullText.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "⭐ *ZORO-MD PLAY* ⭐\n\n❌ What song do you want to download?\n💡 Example: .play Faded"
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } }); } catch {}

        await sock.sendMessage(chatId, {
            text: `_Please wait, your download is in progress..._\n🎵 *Query:* ${searchQuery}`
        }, { quoted: message });

        let video;
        try {
            if (searchQuery.includes('youtube.com') || searchQuery.includes('youtu.be')) {
                const videoId = searchQuery.split('v=')[1] || searchQuery.split('/').pop();
                video = await yts({ videoId: videoId });
            } else {
                const search = await yts(searchQuery);
                if (!search.videos || search.videos.length === 0) {
                    return await sock.sendMessage(chatId, { text: "❌ No songs found!" }, { quoted: message });
                }
                video = search.videos[0];
            }
        } catch (e) {
            console.log('yt-search failed:', e.message);
            return await sock.sendMessage(chatId, { text: `❌ Search failed: ${e.message}` }, { quoted: message });
        }

        let audioBuffer = null;

        // 🔥 LATEST MULTI-API FALLBACK SYSTEM
        // 1. Cobalt API
        try {
            console.log('Trying Cobalt API...');
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
                console.log('✅ Cobalt API Success');
            }
        } catch (e) {
            console.log('Cobalt API failed:', e.message);
        }

        // 2. Fallback API 1 (Keith/Cyril API)
        if (!audioBuffer) {
            try {
                console.log('Trying Fallback API 1...');
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 25000 });
                const downloadUrl = res.data?.result?.download_url || res.data?.url || res.data?.result?.url;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ Fallback API 1 Success');
                }
            } catch (e) {
                console.log('Fallback API 1 failed:', e.message);
            }
        }

        // 3. Fallback API 2 (Guru API)
        if (!audioBuffer) {
            try {
                console.log('Trying Fallback API 2...');
                const res = await axios.get(`https://api.guruapi.tech/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 25000 });
                const downloadUrl = res.data?.result?.downloadUrl || res.data?.downloadUrl || res.data?.result;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ Fallback API 2 Success');
                }
            } catch (e) {
                console.log('Fallback API 2 failed:', e.message);
            }
        }

        if (!audioBuffer) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Download failed. All download servers are currently busy. Please try again later."
            }, { quoted: message });
        }

        // Size Limit - Max 15MB
        if (audioBuffer.length > 15 * 1024 * 1024) {
            return await sock.sendMessage(chatId, { 
                text: `❌ File too large (${(audioBuffer.length/1024/1024).toFixed(2)} MB)\nMax 15MB allowed for WhatsApp. Try a shorter song!` 
            }, { quoted: message });
        }

        // Fetch Thumbnail
        let thumbBuffer = null;
        try {
            if (video.thumbnail) {
                const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            }
        } catch {}

        const adReplyContext = {
            externalAdReply: {
                title: video.title ? video.title.substring(0, 60) : 'ZORO MD MUSIC',
                body: `Duration: ${video.timestamp || 'N/A'} | ZORO MD`,
                thumbnail: thumbBuffer,
                mediaType: 1,
                sourceUrl: video.url,
                showAdAttribution: true
            }
        };

        // Send Audio
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: "audio/mp4",
            ptt: false,
            fileName: `${video.title || 'song'}.mp3`,
            contextInfo: adReplyContext
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } }); } catch {}

    } catch (error) {
        console.error('Error in play command:', error.message);
        await sock.sendMessage(chatId, { 
            text: "❌ Download failed. Please try again later."
        }, { quoted: message });
    }
}

module.exports = playCommand;
