const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');
const crypto = require('crypto');

const RAPID_API_KEY = '59660ea980msh58bb403149b4410p1d66b6jsn68ba86313226';
const RAPID_API_HOST = 'waifu-it.p.rapidapi.com';
const ANIMU_BASE = 'https://api.some-random-api.com/animu';

function normalizeType(input) {
    const lower = (input || '').toLowerCase();
    if (lower === 'facepalm' || lower === 'face_palm') return 'face-palm';
    if (lower === 'quote' || lower === 'animu-quote' || lower === 'animuquote') return 'quote';
    return lower;
}

async function convertMediaToSticker(mediaBuffer, isAnimated) {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputExt = isAnimated ? 'gif' : 'jpg';
    const input = path.join(tmpDir, `animu_${Date.now()}.${inputExt}`);
    const output = path.join(tmpDir, `animu_${Date.now()}.webp`);
    fs.writeFileSync(input, mediaBuffer);

    const ffmpegCmd = isAnimated 
        ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=15" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 60 -compression_level 6 "${output}"`
        : `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${output}"`;

    await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (err) => (err ? reject(err) : resolve()));
    });

    let webpBuffer = fs.readFileSync(output);
    const img = new webp.Image();
    await img.load(webpBuffer);

    const json = {
        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
        'sticker-pack-name': 'Anime Stickers',
        'emojis': ['🎌']
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;

    const finalBuffer = await img.save(null);
    try { fs.unlinkSync(input); } catch {}
    try { fs.unlinkSync(output); } catch {}
    return finalBuffer;
}

async function sendAnimu(sock, chatId, message, type) {
    const endpoint = `${ANIMU_BASE}/${type}`;
    let data = {};
    try {
        const res = await axios.get(endpoint, { timeout: 8000 });
        data = res.data || {};
    } catch (e) {
        try {
            const options = {
                method: 'GET',
                url: `https://${RAPID_API_HOST}/waifu`,
                params: { name: type },
                headers: {
                    'X-RapidAPI-Key': RAPID_API_KEY,
                    'X-RapidAPI-Host': RAPID_API_HOST
                },
                timeout: 8000
            };
            const fallbackRes = await axios.request(options);
            if (fallbackRes.data) {
                data.link = fallbackRes.data.url || fallbackRes.data.image;
            }
        } catch (err) {}
    }

    const mediaLink = data.link || data.url;
    if (mediaLink) {
        const lower = mediaLink.toLowerCase();
        const isGifLink = lower.endsWith('.gif');
        const isImageLink = lower.match(/\.(jpg|jpeg|png|webp)$/);

        if (isGifLink || isImageLink) {
            try {
                const resp = await axios.get(mediaLink, {
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                const mediaBuf = Buffer.from(resp.data);
                const stickerBuf = await convertMediaToSticker(mediaBuf, isGifLink);
                await sock.sendMessage(chatId, { sticker: stickerBuf }, { quoted: message });
                return;
            } catch (error) {
                console.error('Error converting media to sticker:', error);
            }
        }

        try {
            await sock.sendMessage(chatId, { image: { url: mediaLink }, caption: '𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅' }, { quoted: message });
            return;
        } catch {}
    }
    if (data.quote) {
        await sock.sendMessage(chatId, { text: data.quote }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { text: '❌ Failed to fetch animu.' }, { quoted: message });
}

async function animeCommand(sock, chatId, message, args) {
    const signature = "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗔𝗗𝗛𝗜𝗫𝗗👅";

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

        if (subCommand === 'girl') {
            searchQuery = 'Waifu';
        } else if (subCommand === 'boy') {
            searchQuery = 'Naruto';
        } else if (subCommand === 'couple') {
            searchQuery = 'Romance';
        } else if (queryArgs.length > 0 || !['nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'].includes(subCommand)) {
            searchQuery = [subCommand, ...queryArgs].join(' ');
        }

        const sub = normalizeType(subCommand);
        const supported = ['nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'];

        if (supported.includes(sub)) {
            await sendAnimu(sock, chatId, message, sub);
            return;
        }

        try { await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } }); } catch {}

        const options = {
            method: 'GET',
            url: `https://${RAPID_API_HOST}/waifu`,
            params: { name: searchQuery },
            headers: {
                'X-RapidAPI-Key': RAPID_API_KEY,
                'X-RapidAPI-Host': RAPID_API_HOST
            },
            timeout: 10000
        };

        const response = await axios.request(options);
        const data = response.data;

        let imageUrl = data.url || data.image || data.results?.[0]?.url;

        if (!imageUrl && typeof data === 'string' && data.startsWith('http')) {
            imageUrl = data;
        }

        if (!imageUrl) {
            imageUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477";
        }

        await sock.sendMessage(chatId, { 
            image: { url: imageUrl }, 
            caption: signature 
        }, { quoted: message });

        try { await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }); } catch {}

    } catch (err) {
        console.error('Error in anime command:', err);
        await sock.sendMessage(chatId, { text: '❌ Character or anime not found!' }, { quoted: message });
    }
}

module.exports = { animeCommand };
