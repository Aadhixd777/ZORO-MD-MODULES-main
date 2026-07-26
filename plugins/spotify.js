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

        // 🔥 WORKING MULTI-API FALLBACK SYSTEM
        const apis = [
            `https://api.vreden.web.id/api/spotify?query=${encodeURIComponent(query)}`,
            `https://api.agatz.xyz/api/spotify?message=${encodeURIComponent(query)}`,
            `https://api.dreaded.site/api/spotify?query=${encodeURIComponent(query)}`
        ];

        // METHOD 1
        try {
            console.log('Trying Spotify API 1...');
            const res = await axios.get(apis[0], { timeout: 20000 });
            if (res.data?.result) {
                const r = res.data.result;
                const downloadUrl = r.music || r.downloadUrl || r.url || r.link;
                if (downloadUrl) {
                    trackInfo = {
                        title: r.title || r.name || query,
                        artist: r.artists || r.artist || 'Spotify Artist',
                        thumbnail: r.cover || r.thumbnail || r.image,
                        url: r.external_url || 'https://spotify.com'
                    };

                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ Spotify API 1 Success');
                }
            }
        } catch (e) {
            console.log('Spotify API 1 failed:', e.message);
        }

        // METHOD 2: Fallback
        if (!audioBuffer) {
            try {
                console.log('Trying Spotify API 2...');
                const res = await axios.get(apis[1], { timeout: 20000 });
                if (res.data?.data) {
                    const r = res.data.data;
                    const downloadUrl = r.downloadUrl || r.url || r.link || r.music;
                    if (downloadUrl) {
                        trackInfo = {
                            title: r.title || r.name || query,
                            artist: r.artists || r.artist || 'Spotify Artist',
                            thumbnail: r.cover || r.thumbnail || r.image,
                            url: r.external_url || 'https://spotify.com'
                        };

                        const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                        audioBuffer = Buffer.from(audioRes.data);
                        console.log('✅ Spotify API 2 Success');
                    }
                }
            } catch (e) {
                console.log('Spotify API 2 failed:', e.message);
            }
        }

        // METHOD 3: Fallback
        if (!audioBuffer) {
            try {
                console.log('Trying Spotify API 3...');
                const res = await axios.get(apis[2], { timeout: 20000 });
                if (res.data?.result) {
                    const r = res.data.result;
                    const downloadUrl = r.audio || r.downloadUrl || r.url;
                    if (downloadUrl) {
                        trackInfo = {
                            title: r.title || r.name || query,
                            artist: r.artist || 'Spotify Artist',
                            thumbnail: r.thumbnail || r.cover,
                            url: 'https://spotify.com'
                        };

                        const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                        audioBuffer = Buffer.from(audioRes.data);
                        console.log('✅ Spotify API 3 Success');
                    }
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
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${(trackInfo.title || 'song').replace(/[\\/:*?"<>|]/g, '')}.mp3`,
            contextInfo: adReplyContext
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } }); } catch {}

    } catch (error) {
        console.error('[SPOTIFY] error:', error?.message || error);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Spotify audio. Try another query later.' }, { quoted: message });
    }
}

module.exports = spotifyCommand;
