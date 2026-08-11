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
┃ • .animu <type>
┃
╰━━━━━━━━━━━━━━━━━━━`;
            await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
            return;
        }

        const subCommand = args[0].toLowerCase();
        const queryArgs = args.slice(1);
        let searchQuery = subCommand;

        const randomNum = Math.floor(Math.random() * 1000);
        if (subCommand === 'girl') {
            searchQuery = `cute anime girl aesthetic wallpaper ${randomNum}`;
        } else if (subCommand === 'boy') {
            searchQuery = `cool anime boy aesthetic wallpaper ${randomNum}`;
        } else if (subCommand === 'couple') {
            searchQuery = `matching anime couple dp cute ${randomNum}`;
        } else if (queryArgs.length > 0 || !['nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'].includes(subCommand)) {
            searchQuery = [subCommand, ...queryArgs, randomNum].join(' ');
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        // Pinterest API V5 സെർച്ച് കോൾ
        const response = await axios.get(`https://api.pinterest.com/v5/pins`, {
            params: { query: searchQuery, bookmark: '' },
            headers: {
                'Authorization': `Bearer ${PINTEREST_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 12000
        });

        const data = response.data;
        let results = data.items || [];
        let imageUrls = [];

        for (let item of results) {
            let img = item.media?.images?.['originals']?.url || item.media?.images?.['736x']?.url;
            if (img && typeof img === 'string' && !imageUrls.includes(img)) {
                imageUrls.push(img);
            }
        }

        if (imageUrls.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
        }

        // ഫോട്ടോകള് റാൻഡം ആയി സെലക്ട് ചെയ്യാൻ
        for (let i = imageUrls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [imageUrls[i], imageUrls[j]] = [imageUrls[j], imageUrls[i]];
        }

        try {
            const imgResp = await axios.get(imageUrls[0], { responseType: 'arraybuffer', timeout: 10000 });
            await sock.sendMessage(chatId, { image: Buffer.from(imgResp.data), caption: signature }, { quoted: message });
        } catch (err) {
            return await sock.sendMessage(chatId, { text: '❌ Failed to send image stream.' }, { quoted: message });
        }

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err);
        await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
    }
}
