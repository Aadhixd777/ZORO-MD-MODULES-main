const axios = require('axios');

const signature = "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅";

// Direct fallback working image links list to avoid API/Scraping failures
const animeImages = {
    girl: [
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800",
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800",
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"
    ],
    boy: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800"
    ],
    couple: [
        "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800",
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800"
    ],
    default: [
        "https://images.unsplash.com/photo-1563089145-599997674d42?w=800",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"
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

        let imageList = animeImages.default;
        if (query.includes('girl')) {
            imageList = animeImages.girl;
        } else if (query.includes('boy')) {
            imageList = animeImages.boy;
        } else if (query.includes('couple')) {
            imageList = animeImages.couple;
        }

        const selectedImage = imageList[Math.floor(Math.random() * imageList.length)];

        const imgResp = await axios.get(selectedImage, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(chatId, { 
            image: Buffer.from(imgResp.data), 
            caption: signature 
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err.message);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch image, please try again!' }, { quoted: message });
    }
}

module.exports = { animeCommand };
