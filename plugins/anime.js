const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');
const crypto = require('crypto');

const WAIFU_IM_KEY = 'NAhfdsKyVhBZGSivhVCv0p7z9B86qMY0aQfPoNdP8M';
const ANIMU_BASE = 'https://api.some-random-api.com/animu';

function normalizeType(input) {
    const lower = (input || '').toLowerCase();
    if (lower === 'facepalm' || lower === 'face_palm') return 'face-palm';
    if (lower === 'quote' || lower === 'animu-quote' || lower === 'animuquote') return 'quote';
    return lower;
}

async function sendAnimu(sock, chatId, message, type) {
    const endpoint = `${ANIMU_BASE}/${type}`;
    let data = {};
    try {
        const res = await axios.get(endpoint, { timeout: 8000 });
        data = res.data || {};
    } catch (e) {
        try {
            const fallbackRes = await axios.get(`https://api.waifu.im/search?included_tags=${type}`, {
                headers: { 'Authorization': `Bearer ${WAIFU_IM_KEY}` },
                timeout: 8000
            });
            if (fallbackRes.data && fallbackRes.data.images && fallbackRes.data.images.length > 0) {
                data.link = fallbackRes.data.images[0].url;
            }
        } catch (err) {}
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

        if (subCommand === 'girl') {
            const res = await axios.get('https://api.waifu.im/search?included_tags=waifu', {
                headers: { 'Authorization': `Bearer ${WAIFU_IM_KEY}` },
                timeout: 8000
            });
            if (res.data && res.data.images && res.data.images.length > 0) {
                await sock.sendMessage(chatId, { image: { url: res.data.images[0].url }, caption: signature }, { quoted: message });
                return;
            }
        }
        else if (subCommand === 'boy') {
            const res = await axios.get('https://api.waifu.im/search?included_tags=maid', {
                headers: { 'Authorization': `Bearer ${WAIFU_IM_KEY}` },
                timeout: 8000
            });
            if (res.data && res.data.images && res.data.images.length > 0) {
                await sock.sendMessage(chatId, { image: { url: res.data.images[0].url }, caption: signature }, { quoted: message });
                return;
            }
        }
        else if (subCommand === 'couple') {
            const res = await axios.get('https://api.waifu.im/search?included_tags=marin-kitagawa', {
                headers: { 'Authorization': `Bearer ${WAIFU_IM_KEY}` },
                timeout: 8000
            });
            if (res.data && res.data.images && res.data.images.length > 0) {
                await sock.sendMessage(chatId, { image: { url: res.data.images[0].url }, caption: signature }, { quoted: message });
                return;
            }
        }
        else if (queryArgs.length > 0 || (subCommand && !['nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'].includes(subCommand))) {
            const query = [subCommand, ...queryArgs].join(' ');
            const url = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&limit=1`;
            try {
                const res = await axios.get(url, { timeout: 8000 });
                const data = res.data.data;
                if (data && data.length > 0) {
                    const imageUrl = data[0].images.jpg.image_url;
                    await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: signature }, { quoted: message });
                    return;
                }
            } catch (e) {
                const fallbackRes = await axios.get('https://api.waifu.im/search?included_tags=waifu', {
                    headers: { 'Authorization': `Bearer ${WAIFU_IM_KEY}` },
                    timeout: 8000
                });
                if (fallbackRes.data && fallbackRes.data.images && fallbackRes.data.images.length > 0) {
                    await sock.sendMessage(chatId, { image: { url: fallbackRes.data.images[0].url }, caption: signature }, { quoted: message });
                    return;
                }
            }
            await sock.sendMessage(chatId, { text: '❌ Character not found!' }, { quoted: message });
            return;
        }

        const sub = normalizeType(subCommand);
        const supported = ['nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'];

        if (!supported.includes(sub)) {
            await sock.sendMessage(chatId, { text: `❌ Unsupported type: ${sub}. Try one of: ${supported.join(', ')}` }, { quoted: message });
            return;
        }

        await sendAnimu(sock, chatId, message, sub);

    } catch (err) {
        console.error('Error in anime command:', err);
        await sock.sendMessage(chatId, { text: '❌ An error occurred while fetching anime.' }, { quoted: message });
    }
}

module.exports = { animeCommand };
