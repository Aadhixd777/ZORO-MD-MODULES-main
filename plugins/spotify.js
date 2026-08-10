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
                text: '⭐ *ZORO-MD SPOTIFY* ⭐\n\n❌ Usage: .spotify <Spotify Track Link>\n💡 Example: .spotify https://open.spotify.com/track/...' 
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: "🎧", key: message.key } }); } catch {}

        let trackInfo = null;
        let audioBuffer = null;

        try {
            console.log('Fetching from RapidAPI Spotify Downloader...');
            
            const response = await axios.get('https://spotify-downloader9.p.rapidapi.com/downloadSong', {
                params: { songId: query },
                headers: {
                    'content-type': 'application/json',
                    'x-rapidapi-key': '16a174fe52mshb02d15219501300p182615jsne71ecfd86826',
                    'x-rapidapi-host': 'spotify-downloader9.p.rapidapi.com'
                },
                timeout: 30000
            });

            const resData = response.data;
            console.log('API Response:', resData);

            if (resData) {
                const downloadUrl = resData.link || resData.downloadUrl || resData.url || resData.audio || resData.dl;
                
                if (downloadUrl) {
                    trackInfo = {
                        title: resData.title || resData.name || 'Spotify Song',
                        artist: resData.artist || resData.artists || 'Spotify Artist',
                        thumbnail: resData.cover || resData.thumbnail || resData.image,
                        url: query
                    };

                    const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 });
                    audioBuffer = Buffer.from(audioRes.data);
                    console.log('✅ RapidAPI Spotify Success');
                }
            }
        } catch (e) {
            console.log('RapidAPI Spotify failed:', e.message);
        }

        if (!audioBuffer) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Failed to fetch audio. Make sure you are providing a valid Spotify track link.' 
            }, { quoted: message });
        }

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
        await sock.sendMessage(chatId, { text: '❌ Failed to process Spotify request.' }, { quoted: message });
    }
}

module.exports = spotifyCommand;
