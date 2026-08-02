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

        let processingMsg = await sock.sendMessage(chatId, {
            text: `_Please wait, your download is in progress..._\n🎵 *Query:* ${searchQuery}`
        }, { quoted: message });

        let video;
        let trackCover = null;
        let finalQuery = searchQuery;

        // Step 1: Deezer metadata lookup
        try {
            const deezerRes = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}`, { timeout: 8000 });
            if (deezerRes.data && deezerRes.data.data && deezerRes.data.data.length > 0) {
                const track = deezerRes.data.data[0];
                finalQuery = `${track.title} ${track.artist.name}`;
                trackCover = track.album?.cover_medium || null;
            }
        } catch (e) {
            console.log('[Play Metadata]: Deezer lookup skipped...');
        }

        // Step 2: Search on YouTube using yt-search
        try {
            const search = await yts(finalQuery);
            const videos = search?.videos;
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(chatId, { text: "❌ No songs found on YouTube!" }, { quoted: message });
            }
            video = videos[0];

            if (!video || !video.url) {
                return await sock.sendMessage(chatId, { text: "❌ Could not find a valid video for this query!" }, { quoted: message });
            }
        } catch (e) {
            console.error('[Play Search Error]:', e.message);
            return await sock.sendMessage(chatId, { text: `❌ Search failed: ${e.message}` }, { quoted: message });
        }

        let audioBuffer = null;

        // Step 3: Powerful Cobalt & Multi-API Fallback System
        const downloadApis = [
            // Cobalt API (Very Stable & Fast)
            async () => {
                const res = await axios.post('https://api.cobalt.tools/api/json', {
                    url: video.url,
                    isAudioOnly: true,
                    aFormat: 'mp3'
                }, {
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    timeout: 15000
                });
                return res.data?.url || res.data?.picker?.[0]?.url;
            },
            // Vreden API
            async () => {
                const res = await axios.get(`https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 15000 });
                return res.data?.result?.download?.url || res.data?.result?.url;
            },
            // Siputzx API
            async () => {
                const res = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 15000 });
                return res.data?.data?.dl || res.data?.data?.download;
            }
        ];

        for (const apiFn of downloadApis) {
            if (audioBuffer) break;
            try {
                const downloadUrl = await apiFn();
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 45000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    if (audioBuffer && audioBuffer.length > 1000) break;
                }
            } catch (err) {
                console.log(`[Play API Error]: Trying next high-performance endpoint...`);
            }
        }

        if (!audioBuffer) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Download failed. All download servers are currently busy. Please try again later."
            }, { quoted: message });
        }

        // Validate file size limit (Max 15MB for WhatsApp)
        if (audioBuffer.length > 15 * 1024 * 1024) {
            return await sock.sendMessage(chatId, { 
                text: `❌ File too large (${(audioBuffer.length/1024/1024).toFixed(2)} MB)\nMax 15MB allowed for WhatsApp. Try a shorter song!` 
            }, { quoted: message });
        }

        // Step 4: Fetch thumbnail safely
        let thumbBuffer = null;
        try {
            const imgUrl = trackCover || video.thumbnail;
            if (imgUrl) {
                const thumbRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            }
        } catch (err) {
            console.log('[Play Thumbnail]: Skipped...');
        }

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

        // Step 5: Send final audio message to chat
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `${video.title ? video.title.replace(/[\/\\?%*:|"<>]/g, '') : 'song'}.mp3`,
            contextInfo: adReplyContext
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } }); } catch {}

    } catch (error) {
        console.error('[Play Command Error]:', error.message);
        await sock.sendMessage(chatId, { 
            text: "❌ Download failed. Please try again later."
        }, { quoted: message });
    }
}

module.exports = playCommand;
