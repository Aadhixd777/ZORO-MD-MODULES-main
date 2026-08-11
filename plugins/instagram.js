const axios = require('axios');
const { igdl } = require('ruhend-scraper'); // Already in your package.json

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
        let mediaUrl = null;

        // Try using ruhend-scraper first (Most stable for IG videos)
        try {
            const res = await igdl(igUrl);
            if (res && res.data && res.data.length > 0) {
                mediaUrl = res.data[0].url;
            }
        } catch (e) {}

        // Fallback to RapidAPI if scraper fails
        if (!mediaUrl) {
            const rapidApiKey = "59660ea980msh58bb403149b4410p1d66b6jsn68ba86313226";
            const rapidApiHost = "instagram-reels-downloader-api.p.rapidapi.com";

            const options = {
                method: 'GET',
                url: `https://${rapidApiHost}/download`,
                params: { url: igUrl },
                headers: {
                    'X-RapidAPI-Key': rapidApiKey,
                    'X-RapidAPI-Host': rapidApiHost
                },
                timeout: 25000
            };

            const response = await axios.request(options);
            if (response.data) {
                const data = response.data.result || response.data.data || response.data;
                mediaUrl = Array.isArray(data) ? (data[0].url || data[0].downloadUrl) : (data.url || data.downloadUrl || data.link);
            }
        }

        if (!mediaUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Could not fetch media. Please check the link."
            }, { quoted: message });
        }

        // Send video directly using URL so WhatsApp streaming handles the playback natively
        await sock.sendMessage(chatId, {
            video: { url: mediaUrl },
            mimetype: "video/mp4",
            caption: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗭𝗢𝗥𝗢 𝗠𝗗 🔥"
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (error) {
        console.error('Instagram Error:', error.message);
        await sock.sendMessage(chatId, { 
            text: "❌ An error occurred while processing the Instagram video."
        }, { quoted: message });
    }
}

module.exports = instagramCommand;
