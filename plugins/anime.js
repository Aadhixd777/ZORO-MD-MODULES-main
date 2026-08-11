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

        const randomNum = Math.floor(Math.random() * 1000);
        if (query === 'girl') {
            searchQuery = `cute anime girl aesthetic wallpaper ${randomNum}`;
        } else if (query === 'boy') {
            searchQuery = `cool anime boy aesthetic wallpaper ${randomNum}`;
        } else if (query === 'couple') {
            searchQuery = `matching anime couple dp cute ${randomNum}`;
        } else {
            searchQuery = `${query} anime wallpaper ${randomNum}`;
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        // Reliable Public Search API endpoint
        const apiUrl = `https://delirius-apiofc.vercel.app/search/pinterest?text=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(apiUrl);
        const results = response.data?.results || [];

        if (results.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
        }

        // Pick a random image from the results
        const randomImage = results[Math.floor(Math.random() * results.length)];

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
