const axios = require('axios');

const signature = "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅";
const RAPID_API_KEY = "2e217f019emsh51c0ae7f2c85cb5p17d270jsnc865e97bfc82";
const RAPID_API_HOST = "pinterest-downloader-download-pinterest-image-video-and-reels.p.rapidapi.com";

async function animeCommand(sock, chatId, message, args) {
    try {
        if (!args || args.length === 0) {
            const menuText = 
`╭━━━ 🎌 *ANIME MENU* 🎌━━━
┃
┃ • .anime couple
┃ • .anime girl
┃ • .anime boy
┃ • .anime naruto
┃ • .anime [character name]
┃
╰━━━━━━━━━━━━━━━━━━━`;
            await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
            return;
        }

        const query = args.join(' ');
        
        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        // RapidAPI Search Pins endpoint call
        const options = {
            method: 'GET',
            url: `https://${RAPID_API_HOST}/pins/search`,
            params: { query: `${query} anime wallpaper` },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': RAPID_API_HOST
            }
        };

        const response = await axios.request(options);
        
        // Extracting pins data based on typical RapidAPI Pinterest structures
        const dataNode = response.data?.data || response.data?.result || response.data?.pins || response.data;
        const results = Array.isArray(dataNode) ? dataNode : (dataNode?.results || []);

        if (!results || results.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
        }

        // Randomly pick an image from the results
        const randomItem = results[Math.floor(Math.random() * results.length)];
        const imageUrl = randomItem?.images?.orig?.url || randomItem?.image || randomItem?.url || randomItem;

        if (!imageUrl || typeof imageUrl !== 'string') {
            return await sock.sendMessage(chatId, { text: '❌ Image not found!' }, { quoted: message });
        }

        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(chatId, { 
            image: Buffer.from(imgResp.data), 
            caption: signature 
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch image from API!' }, { quoted: message });
    }
}

module.exports = { animeCommand };
