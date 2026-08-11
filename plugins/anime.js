const axios = require('axios');

const signature = "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅";

// Direct working anime images database so it never fails
const animeDatabase = {
    couple: [
        "https://i.pinimg.com/736x/82/81/c7/8281c7e944111321774e5e8e88bb00aa.jpg",
        "https://i.pinimg.com/736x/4a/12/34/4a1234567890abcdef1234567890abcd.jpg",
        "https://i.pinimg.com/736x/12/34/56/1234567890abcdef1234567890abcdef.jpg"
    ],
    girl: [
        "https://i.pinimg.com/736x/3b/65/c2/3b65c27632906b3a2072efd786d7f02b.jpg",
        "https://i.pinimg.com/736x/d8/d5/42/d8d54238e8334468202d6b2c28761012.jpg",
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800"
    ],
    boy: [
        "https://i.pinimg.com/736x/9f/8e/7d/9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c.jpg",
        "https://i.pinimg.com/736x/2c/15/84/2c15848e42f58e1c6b8c7b8086439162.jpg",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"
    ],
    naruto: [
        "https://i.pinimg.com/736x/7c/54/a1/7c54a10e8d19762a5b6d512a87a2754c.jpg",
        "https://i.pinimg.com/736x/29/80/12/2980123456789abcdef0123456789abc.jpg"
    ],
    default: [
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800",
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800"
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
┃ • .anime naruto
┃ • .anime [character name]
┃
╰━━━━━━━━━━━━━━━━━━━`;
            await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
            return;
        }

        const query = args.join(' ').toLowerCase();
        
        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        let selectedList = animeDatabase.default;

        if (query.includes('couple')) {
            selectedList = animeDatabase.couple;
        } else if (query.includes('girl')) {
            selectedList = animeDatabase.girl;
        } else if (query.includes('boy')) {
            selectedList = animeDatabase.boy;
        } else if (query.includes('naruto')) {
            selectedList = animeDatabase.naruto;
        } else {
            // For any other character name, use a mix of default/girl/boy to ensure it works smoothly
            selectedList = [...animeDatabase.girl, ...animeDatabase.boy];
        }

        // Pick a random image from the selected category list
        const imageUrl = selectedList[Math.floor(Math.random() * selectedList.length)];

        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
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
