const axios = require('axios');

const PINTEREST_ACCESS_TOKEN = 'Pina_AMA6W2AYAB5XUAIAGBAMMDWZ2PBO7HYBQBIQC4IEME3XFSCNUWKW6IUADPUOYFFHCQLF6VE4MPMF7D3CO27XTDHCHFLMGEQA'; 
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

        const query = args.join(' ');
        const randomNum = Math.floor(Math.random() * 1000);
        let searchQuery = query;

        if (query === 'girl') searchQuery = `cute anime girl aesthetic wallpaper ${randomNum}`;
        else if (query === 'boy') searchQuery = `cool anime boy aesthetic wallpaper ${randomNum}`;
        else if (query === 'couple') searchQuery = `matching anime couple dp cute ${randomNum}`;
        else searchQuery = `${query} anime wallpaper ${randomNum}`;

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        const response = await axios.get(`https://api.pinterest.com/v5/pins`, {
            params: { query: searchQuery, bookmark: '' },
            headers: {
                'Authorization': `Bearer ${PINTEREST_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 12000
        });

        const items = response.data?.items || [];
        let imageUrls = [];

        for (let item of items) {
            let img = item.media?.images?.['originals']?.url || 
                      item.media?.images?.['736x']?.url || 
                      item.media?.images?.['474x']?.url;
            if (img) imageUrls.push(img);
        }

        if (imageUrls.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
        }

        const randomImage = imageUrls[Math.floor(Math.random() * imageUrls.length)];

        const imgResp = await axios.get(randomImage, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(chatId, { image: Buffer.from(imgResp.data), caption: signature }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
    }
}

module.exports = { animeCommand };
