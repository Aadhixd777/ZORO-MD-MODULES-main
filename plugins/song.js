const _0x1a8f = [
    'yt-search', '../../src/Functions/media.js', 'split', 'slice', 'join', 
    'trim', 'message', 'conversation', 'extendedTextMessage', 'text', 
    'sendMessage', 'react', '⚡', 'key', 'videos', 'url', 'title', 
    'timestamp', 'thumbnail', 'audio/mpeg', '👑', 'stream'
];

const _0x3e1d = function (_0x51c2, _0x4f12) {
    _0x51c2 = _0x51c2 - 0x0;
    let _0x2a9b = _0x1a8f[_0x51c2];
    return _0x2a9b;
};

const yts = require(_0x3e1d('0x0'));
const { ytStream, media, size } = require(_0x3e1d('0x1'));

async function songCommand(sock, chatId, message) {
    try {
        const fullText = message[_0x3e1d('0x6')]?.[_0x3e1d('0x7')] || message[_0x3e1d('0x6')]?.[_0x3e1d('0x8')]?.[_0x3e1d('0x9')] || '';
        const text = fullText[_0x3e1d('0x2')](' ')[_0x3e1d('0x3')](1)[_0x3e1d('0x4')](' ')[_0x3e1d('0x5')]();

        if (!text) {
            return await sock[_0x3e1d('0xa')](chatId, { 
                text: '⭐ *ZORO-MD MUSIC* ⭐\n\n❌ Provide song name or YouTube URL!\n💡 Example: .song Faded' 
            }, { quoted: message });
        }

        try { await sock[_0x3e1d('0xa')](chatId, { react: { text: _0x3e1d('0xc'), key: message[_0x3e1d('0xd')] } }); } catch {}

        let processingMsg = null;
        try {
            processingMsg = await sock[_0x3e1d('0xa')](chatId, { 
                text: `🔍 *ZORO-MD SEARCHING* 🔍\n\n» Query: ${text}\n» Status: 📡 Searching YouTube...` 
            }, { quoted: message });
        } catch (e) {}

        console.log(`🎵 Searching: ${text}`);
        let video;

        try {
            const searchRes = await yts(text);
            if (!searchRes[_0x3e1d('0xe')] || searchRes[_0x3e1d('0xe')].length === 0) {
                return await sock[_0x3e1d('0xa')](chatId, { text: "❌ No songs found!" }, { quoted: message });
            }
            video = searchRes[_0x3e1d('0xe')][0];
        } catch (e) {
            return await sock[_0x3e1d('0xa')](chatId, { text: `❌ Search failed: ${e.message}` }, { quoted: message });
        }

        if (processingMsg) {
            try {
                await sock[_0x3e1d('0xa')](chatId, { 
                    text: `🎵 *ZORO-MD MUSIC* 🎵\n\n📝 Title: ${video[_0x3e1d('0x10')]}\n⏱️ Duration: ${video[_0x3e1d('0x11')] || 'N/A'}\n📥 Downloading audio...`,
                }, { quoted: message });
            } catch {}
        }

        // ഒറിജിനൽ Media Function വഴി ഡൗൺലോഡ് ചെയ്യുന്നു
        let downloadData;
        try {
            downloadData = await ytStream(video[_0x3e1d('0xf')], 'audio');
        } catch (e) {
            downloadData = await media(video[_0x3e1d('0xf')]);
        }

        if (!downloadData) {
            return await sock[_0x3e1d('0xa')](chatId, { text: "❌ Download failed from local media module!" }, { quoted: message });
        }

        // സൈസ് ലിമിറ്റ് ചെക്കിംഗ്
        if (downloadData.size) {
            const isLimitExceeded = await size(downloadData.size, 50);
            if (isLimitExceeded) {
                return await sock[_0x3e1d('0xa')](chatId, { text: `❌ File too large! (${downloadData.size})` }, { quoted: message });
            }
        }

        const adReplyContext = {
            externalAdReply: {
                title: video[_0x3e1d('0x10')].substring(0, 60),
                body: `Duration: ${video[_0x3e1d('0x11')] || 'N/A'} | ZORO MD`,
                thumbnailUrl: video[_0x3e1d('0x12')],
                mediaType: 1,
                sourceUrl: video[_0x3e1d('0xf')],
                showAdAttribution: true
            }
        };

        console.log(`🚀 Sending audio: ${video[_0x3e1d('0x10')]}`);

        await sock[_0x3e1d('0xa')](chatId, {
            audio: downloadData[_0x3e1d('0x15')] ? { stream: downloadData[_0x3e1d('0x15')] } : { url: downloadData.url },
            mimetype: _0x3e1d('0x13'),
            ptt: false,
            contextInfo: adReplyContext
        }, { quoted: message });

        await sock[_0x3e1d('0xa')](chatId, { 
            text: `✅ *ZORO-MD DELIVERED* ✅\n\n🎶 *${video[_0x3e1d('0x10')]}*\n⏱️ ${video[_0x3e1d('0x11')] || 'N/A'}\n🔗 ${video[_0x3e1d('0xf')]}` 
        }, { quoted: message });
        
        try { await sock[_0x3e1d('0xa')](chatId, { react: { text: _0x3e1d('0x14'), key: message[_0x3e1d('0xd')] } }); } catch {}

    } catch (err) {
        console.error('Song Error:', err.message);
        try {
            await sock[_0x3e1d('0xa')](chatId, { text: `❌ Error: ${err.message}\nTry again!` }, { quoted: message });
        } catch {}
    }
}

module.exports = songCommand;
