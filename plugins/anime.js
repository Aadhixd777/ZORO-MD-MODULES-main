const axios = require('axios');

const signature = "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅";

// കൂടുതൽ ആനിമി ഫോട്ടോകളുടെ നേരിട്ടുള്ള ലിങ്കുകൾ ഇവിടെ നൽകാം, അതുകൊണ്ട് പലതരം ഫോട്ടോകൾ മാറി മാറി വരും
const fallbackImages = {
    couple: [
        "https://i.pinimg.com/736x/82/81/c7/8281c7e944111321774e5e8e88bb00aa.jpg",
        "https://i.pinimg.com/736x/4a/5b/6c/4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d.jpg",
        "https://i.pinimg.com/736x/12/34/56/1234567890abcdef1234567890abcdef.jpg"
    ],
    girl: [
        "https://i.pinimg.com/736x/3b/65/c2/3b65c27632906b3a2072efd786d7f02b.jpg",
        "https://i.pinimg.com/736x/d8/d5/42/d8d54238e8334468202d6b2c28761012.jpg"
    ],
    boy: [
        "https://i.pinimg.com/736x/9f/8e/7d/9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c.jpg",
        "https://i.pinimg.com/736x/2c/15/84/2c15848e42f58e1c6b8c7b8086439162.jpg"
    ]
};

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
        
        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        let targetQuery = `${query} anime wallpaper aesthetic`;
        if (query.includes('couple')) {
            targetQuery = 'matching anime couple cute wallpaper';
        } else if (query.includes('girl')) {
            targetQuery = 'cute anime girl aesthetic wallpaper';
        } else if (query.includes('boy')) {
            targetQuery = 'cool anime boy aesthetic wallpaper';
        }

        const apiUrl = `https://bk9.fun/search/pinterest?q=${encodeURIComponent(targetQuery)}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });
        
        let results = response.data?.result || response.data?.data || [];

        if (!results || results.length === 0) {
            if (query.includes('couple')) results = fallbackImages.couple;
            else if (query.includes('girl')) results = fallbackImages.girl;
            else if (query.includes('boy')) results = fallbackImages.boy;
            else results = fallbackImages.girl;
        }

        const randomItem = results[Math.floor(Math.random() * results.length)];
        const imageUrl = typeof randomItem === 'string' ? randomItem : (randomItem.image || randomItem.url);

        if (!imageUrl) {
            return await sock.sendMessage(chatId, { text: '❌ Image not found for this query!' }, { quoted: message });
        }

        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(chatId, { 
            image: Buffer.from(imgResp.data), 
            caption: signature 
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err.message);
        try {
            const safeImg = fallbackImages.girl[Math.floor(Math.random() * fallbackImages.girl.length)];
            const imgResp = await axios.get(safeImg, { responseType: 'arraybuffer', timeout: 10000 });
            await sock.sendMessage(chatId, { image: Buffer.from(imgResp.data), caption: signature }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch image, please try again!' }, { quoted: message });
        }
    }
}

module.exports = { animeCommand };
