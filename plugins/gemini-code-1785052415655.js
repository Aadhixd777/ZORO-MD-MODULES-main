const axios = require('axios');

// Processed messages tracking to prevent spam
const processedMessages = new Set();

function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    
    for (const media of mediaData) {
        const url = typeof media === 'string' ? media : media?.url;
        if (!url || typeof url !== 'string') continue;
        
        if (!seenUrls.has(url)) {
            seenUrls.add(url);
            uniqueMedia.push({ url });
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
        const urlInput = args[0] || fullText;

        // Enhanced Regex to support Posts, Reels, IGTV, and Share Links
        const instagramPattern = /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv|share)\/([A-Za-z0-9_-]+)/i;
        const match = urlInput.match(instagramPattern);

        if (!match) {
            return await sock.sendMessage(chatId, { 
                text: "⭐ *ZORO-MD INSTAGRAM* ⭐\n\n❌ Please provide a valid Instagram post/reel link!\n💡 Example: .ig https://www.instagram.com/reel/Cxxxxxx/"
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        let mediaList = [];
        const igUrl = match[0];

        // 🔥 WORKING MULTI-API FALLBACK SYSTEM
        const apis = [
            `https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(igUrl)}`,
            `https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(igUrl)}`,
            `https://api.dreaded.site/api/igdl?url=${encodeURIComponent(igUrl)}`
        ];

        // API 1
        try {
            console.log('Trying Instagram API 1...');
            const res = await axios.get(apis[0], { timeout: 20000 });
            if (res.data?.result) {
                const results = Array.isArray(res.data.result) ? res.data.result : [res.data.result];
                results.forEach(item => {
                    const dlUrl = item.url || item.downloadUrl || item;
                    if (dlUrl) mediaList.push({ url: dlUrl });
                });
            }
        } catch (e) {
            console.log('Instagram API 1 failed:', e.message);
        }

        // API 2: Fallback
        if (mediaList.length === 0) {
            try {
                console.log('Trying Instagram API 2...');
                const res = await axios.get(apis[1], { timeout: 20000 });
                if (res.data?.data) {
                    const results = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
                    results.forEach(item => {
                        const dlUrl = item.url || item.downloadUrl || item;
                        if (dlUrl) mediaList.push({ url: dlUrl });
                    });
                }
            } catch (e) {
                console.log('Instagram API 2 failed:', e.message);
            }
        }

        // API 3: Fallback
        if (mediaList.length === 0) {
            try {
                console.log('Trying Instagram API 3...');
                const res = await axios.get(apis[2], { timeout: 20000 });
                if (res.data?.result) {
                    const results = Array.isArray(res.data.result) ? res.data.result : [res.data.result];
                    results.forEach(item => {
                        const dlUrl = item.url || item.downloadUrl || item;
                        if (dlUrl) mediaList.push({ url: dlUrl });
                    });
                }
            } catch (e) {
                console.log('Instagram API 3 failed:', e.message);
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

                const isVideo = contentType.includes('video') || /\.(mp4|mov|webm)/i.test(mediaUrl) || igUrl.includes('/reel');

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