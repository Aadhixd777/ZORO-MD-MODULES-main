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
        let trackCover = null;
        let finalQuery = searchQuery;

        // Step 1: Try fetching official metadata using Deezer API for better search accuracy
        try {
            const deezerRes = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}`, { timeout: 10000 });
            if (deezerRes.data && deezerRes.data.data && deezerRes.data.data.length > 0) {
                const track = deezerRes.data.data[0];
                finalQuery = `${track.title} ${track.artist.name}`;
                trackCover = track.album?.cover_medium || null;
            }
        } catch (e) {
            console.log('Deezer metadata lookup skipped, using raw search query...');
        }

        // Step 2: Search on YouTube using yt-search
        try {
            if (finalQuery.includes('youtube.com') || finalQuery.includes('youtu.be')) {
                const search = await yts(finalQuery);
                video = search.videos ? search.videos[0] : search;
            } else {
                const search = await yts(finalQuery);
                if (!search.videos || search.videos.length === 0) {
                    return await sock.sendMessage(chatId, { text: "❌ No songs found!" }, { quoted: message });
                }
                video = search.videos[0];
            }

            if (!video || !video.url) {
                return await sock.sendMessage(chatId, { text: "❌ Could not find a valid video for this query!" }, { quoted: message });
            }
        } catch (e) {
            console.error('yt-search failed:', e.message);
            return await sock.sendMessage(chatId, { text: `❌ Search failed: ${e.message}` }, { quoted: message });
        }

        let audioBuffer = null;

        // Step 3: Multi-API Fallback System for robust audio downloading
        const downloadApis = [
            `https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(video.url)}`
        ];

        // Trying API 1
        try {
            const res = await axios.get(downloadApis[0], { timeout: 20000 });
            const downloadUrl = res.data?.result?.download?.url || res.data?.result?.url || res.data?.url;
            if (downloadUrl) {
                const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                audioBuffer = Buffer.from(audioRes.data);
            }
        } catch (e) {
            console.log('API 1 failed, trying backup...');
        }

        // Trying API 2 (Fallback)
        if (!audioBuffer) {
            try {
                const res = await axios.get(downloadApis[1], { timeout: 20000 });
                const downloadUrl = res.data?.data?.downloadUrl || res.data?.result?.downloadUrl || res.data?.data?.url;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                }
            } catch (e) {
                console.log('API 2 failed, trying backup...');
            }
        }

        // Trying API 3 (Fallback)
        if (!audioBuffer) {
            try {
                const res = await axios.get(downloadApis[2], { timeout: 20000 });
                const downloadUrl = res.data?.result?.downloadUrl || res.data?.result?.audio;
                if (downloadUrl) {
                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                }
            } catch (e) {
                console.log('API 3 failed.');
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
                const thumbRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            }
        } catch (err) {
            console.log('Thumbnail fetch failed, skipping...');
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
        console.error('Error in play command:', error.message);
        await sock.sendMessage(chatId, { 
            text: "❌ Download failed. Please try again later."
        }, { quoted: message });
    }
}

module.exports = playCommand;
