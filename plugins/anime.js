const axios = require('axios');

const signature = "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅";

async function animeCommand(sock, chatId, message, args) {
    try {
        if (!args || args.length === 0) {
            const menuText = 
`╭━━━ 🎌 *ANIME MENU* 🎌━━━
┃
┃ • .anime couple
┃ • .anime girl
┃ • .anime boy
┃ • .anime [character name]
┃
╰━━━━━━━━━━━━━━━━━━━`;
            await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
            return;
        }

        const query = args.join(' ').toLowerCase();
        let searchQuery = query;

        if (query === 'girl') {
            searchQuery = `cute anime girl aesthetic wallpaper`;
        } else if (query === 'boy') {
            searchQuery = `cool anime boy aesthetic wallpaper`;
        } else if (query === 'couple') {
            searchQuery = `matching anime couple dp cute`;
        } else {
            searchQuery = `${query} anime wallpaper`;
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        // Direct Pinterest search scraper endpoint
        const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`;
        const htmlRes = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        // Extract image URLs from Pinterest html using regex
        const matches = htmlRes.data.match(/"(https:\/\/i\.pinimg\.com\/736x\/[^"]+\.(?:jpg|png))"/g);
        
        if (!matches || matches.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
        }

        // Clean up extracted URLs
        const imageUrls = matches.map(m => m.replace(/"/g, ''));
        const uniqueUrls = [...new Set(imageUrls)];

        const randomImage = uniqueUrls[Math.floor(Math.random() * uniqueUrls.length)];

        const imgResp = await axios.get(randomImage, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(chatId, { 
            image: Buffer.from(imgResp.data), 
            caption: signature 
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
    }
}

module.exports = { animeCommand };
