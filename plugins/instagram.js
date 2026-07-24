const axios = require('axios');
const { igdl } = require("ruhend-scraper");

// Processed messages tracking
const processedMessages = new Set();

function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    
    for (const media of mediaData) {
        const url = media.url || media;
        if (!url || typeof url !== 'string') continue;
        
        if (!seenUrls.has(url)) {
            seenUrls.add(url);
            uniqueMedia.push(typeof media === 'string' ? { url } : media);
        }
    }
    return uniqueMedia;
}

async function instagramCommand(sock, chatId, message) {
    try {
        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);
        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = fullText.split(' ').slice(1);
        const url = args[0] || fullText;

        const instagramPattern = /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
        const match = url.match(instagramPattern);

        if (!match) {
            return await sock.sendMessage(chatId, { 
                text: "⭐ *ZORO-MD INSTAGRAM* ⭐\n\n❌ Please provide a valid Instagram post/reel link!\n💡 Example: .ig https://www.instagram.com/reel/Cxxxxxx/"
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        let mediaList = [];

        // 🔥 METHOD 1: Fast Cobalt API
        try {
            console.log('Trying API 1 (Cobalt)...');
            const res = await axios.post('https://api.cobalt.tools/api/json', {
                url: match[0],
                downloadMode: 'auto'
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 15000
            });

            if (res.data && res.data.url) {
                mediaList.push({ url: res.data.url });
            } else if (res.data && res.data.picker) {
                res.data.picker.forEach(item => mediaList.push({ url: item.url }));
            }
        } catch (e) {
            console.log('API 1 failed:', e.message);
        }

        // 🔥 METHOD 2: Fallback Cyril API
        if (mediaList.length === 0) {
            try {
                console.log('Trying API 2...');
                const res = await axios.get(`https://api.davidcyriltech.my.id/download/instagram?url=${encodeURIComponent(match[0])}`, { timeout: 20000 });
                if (res.data && res.data.result) {
                    const results = Array.isArray(res.data.result) ? res.data.result : [res.data.result];
                    results.forEach(item => {
                        if (item.url || item.download_url) {
                            mediaList.push({ url: item.url || item.download_url });
                        }
                    });
                }
            } catch (e) {
                console.log('API 2 failed:', e.message);
            }
        }

        // 🔥 METHOD 3: Fallback ruhend-scraper
        if (mediaList.length === 0) {
            try {
                console.log('Trying ruhend-scraper...');
                const downloadData = await igdl(match[0]);
                if (downloadData && downloadData.data) {
                    mediaList = downloadData.data;
                }
            } catch (e) {
                console.log('ruhend-scraper failed:', e.message);
            }
        }

        const uniqueMedia = extractUniqueMedia(mediaList).slice(0, 10);

        if (uniqueMedia.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Could not fetch media. The post might be from a private account or all servers are busy."
            }, { quoted: message });
        }

        // Download and Send Media
        for (let i = 0; i < uniqueMedia.length; i++) {
            try {
                const mediaUrl = uniqueMedia[i].url;
                const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });
                const buffer = Buffer.from(mediaRes.data);
                const contentType = mediaRes.headers['content-type'] || '';

                const isVideo = contentType.includes('video') || /\.(mp4|mov|webm)/i.test(mediaUrl) || match[0].includes('/reel/');

                if (isVideo) {
                    await sock.sendMessage(chatId, {
                        video: buffer,
                        mimetype: "video/mp4",
                        caption: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗭𝗢𝗥𝗢 𝗠𝗗 🔥"
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, {
                        image: buffer,
                        caption: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗭𝗢𝗥𝗢 𝗠𝗗 🔥"
                    }, { quoted: message });
                }

                if (i < uniqueMedia.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (mediaErr) {
                console.error(`Error sending media ${i + 1}:`, mediaErr.message);
            }
        }

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (error) {
        console.error('Error in Instagram command:', error.message);
        await sock.sendMessage(chatId, { 
            text: "❌ An error occurred while processing the Instagram request."
        }, { quoted: message });
    }
}

module.exports = instagramCommand;
