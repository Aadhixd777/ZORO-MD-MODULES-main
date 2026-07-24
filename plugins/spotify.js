const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: '⭐ *ZORO-MD SPOTIFY* ⭐\n\n❌ Usage: .spotify <song name or link>\n💡 Example: .spotify Con Calma' 
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: "🎧", key: message.key } }); } catch {}

        let trackInfo = null;
        let audioBuffer = null;

        // 🔥 METHOD 1: Cyril Spotify API
        try {
            console.log('Trying Spotify API 1...');
            const res = await axios.get(`https://api.davidcyriltech.my.id/spotify?query=${encodeURIComponent(query)}`, { timeout: 20000 });
            if (res.data && res.data.success && res.data.download_url) {
                trackInfo = {
                    title: res.data.track_name || 'Spotify Track',
                    artist: res.data.artist || 'Unknown Artist',
                    thumbnail: res.data.thumbnail,
                    url: res.data.external_url || ''
                };

                const audioRes = await axios.get(res.data.download_url, { responseType: 'arraybuffer', timeout: 60000 });
                audioBuffer = Buffer.from(audioRes.data);
                console.log('✅ Spotify API 1 Success');
            }
        } catch (e) {
            console.log('Spotify API 1 failed:', e.message);
        }

        // 🔥 METHOD 2: Guru API Fallback
        if (!audioBuffer) {
            try {
                console.log('Trying Spotify API 2...');
                const res = await axios.get(`https://api.guruapi.tech/spotifydl?url=${encodeURIComponent(query)}`, { timeout: 20000 });
                const dlUrl = res.data?.downloadUrl || res.data?.result?.downloadUrl;
                if (dlUrl) {
                    trackInfo = {
                        title: res.data?.title || query,
                        artist: res.data?.artists || '',
                        thumbnail: res.data?.cover
                    };

                    const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ Spotify API 2 Success');
                }
            } catch (e) {
                console.log('Spotify API 2 failed:', e.message);
            }
        }

        // 🔥 METHOD 3: Okatsu Fallback
        if (!audioBuffer) {
            try {
                console.log('Trying Spotify API 3...');
                const res = await axios.get(`https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`, { timeout: 20000 });
                if (res.data?.status && res.data?.result?.audio) {
                    const r = res.data.result;
                    trackInfo = {
                        title: r.title || r.name || query,
                        artist: r.artist || '',
                        thumbnail: r.thumbnails
                    };

                    const audioRes = await axios.get(r.audio, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ Spotify API 3 Success');
                }
            } catch (e) {
                console.log('Spotify API 3 failed:', e.message);
            }
        }

        if (!audioBuffer) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Failed to fetch Spotify audio. All servers are currently busy.' 
            }, { quoted: message });
        }

        // Thumbnail context setup
        let thumbBuffer = null;
        try {
            if (trackInfo?.thumbnail) {
                const thumbRes = await axios.get(trackInfo.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            }
        } catch {}

        const adReplyContext = {
            externalAdReply: {
                title: trackInfo.title,
                body: trackInfo.artist ? `Artist: ${trackInfo.artist}` : 'ZORO MD SPOTIFY',
                thumbnail: thumbBuffer,
                mediaType: 1,
                sourceUrl: trackInfo.url || 'https://spotify.com',
                showAdAttribution: true
            }
        };

        // Send Audio File
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${trackInfo.title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
            contextInfo: adReplyContext
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } }); } catch {}

    } catch (error) {
        console.error('[SPOTIFY] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Spotify audio. Try another query later.' }, { quoted: message });
    }
}

module.exports = spotifyCommand;
