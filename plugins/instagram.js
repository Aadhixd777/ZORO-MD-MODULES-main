const axios = require('axios');

const processedMessages = new Set();

async function instagramCommand(sock, chatId, message) {
    try {
        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);
        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = fullText.trim().split(/\s+/).slice(1);
        const urlInput = args[0] || fullText;

        const instagramPattern = /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv|share)\/([A-Za-z0-9_-]+)/i;
        const match = urlInput.match(instagramPattern);

        if (!match) {
            return await sock.sendMessage(chatId, { 
                text: "⭐ *ZORO-MD INSTAGRAM* ⭐\n\n❌ Please provide a valid Instagram link!\n💡 Example: .ig https://www.instagram.com/reel/Cxxxxxx/"
            }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        const igUrl = match[0];

        // 🔑 Your RapidAPI Credentials
        const rapidApiKey = "59660ea980msh58bb403149b4410p1d66b6jsn68ba86313226";
        const rapidApiHost = "instagram-downloader-scraper-reels-igtv-posts-stories.p.rapidapi.com";

        const options = {
            method: 'GET',
            url: `https://${rapidApiHost}/v1/social/posts`,
            params: { url: igUrl },
            headers: {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': rapidApiHost
            },
            timeout: 25000
        };

        const response = await axios.request(options);
        
        let mediaUrl = null;
        if (response.data) {
            const data = response.data.result || response.data.data || response.data;
            mediaUrl = Array.isArray(data) ? (data[0].url || data[0].downloadUrl) : (data.url || data.downloadUrl);
        }

        if (!mediaUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Could not fetch media from RapidAPI. Please check the endpoint or link."
            }, { quoted: message });
        }

        const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(mediaRes.data);
        const contentType = mediaRes.headers['content-type'] || '';

        const isVideo = contentType.includes('video') || igUrl.includes('/reel');

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

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (error) {
        console.error('RapidAPI Error:', error.message);
        await sock.sendMessage(chatId, { 
            text: "❌ An error occurred while processing via RapidAPI."
        }, { quoted: message });
    }
}

module.exports = instagramCommand;
