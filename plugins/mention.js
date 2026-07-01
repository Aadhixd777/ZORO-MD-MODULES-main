const { Function, getBuffer, parseJsonModule, setDB, Message } = require('../lib/');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../lib/db'); 

async function toSticker(buffer) {
    const tempFilePath = path.join(os.tmpdir(), 'sticker.webp');
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-i', '-', '-vf', 'scale=512:-1', '-loop', '0', '-vcodec', 'libwebp', tempFilePath]);
        ffmpeg.stdin.end(buffer);
        ffmpeg.on('close', () => {
            if (fs.existsSync(tempFilePath)) {
                const file = fs.readFileSync(tempFilePath);
                fs.unlinkSync(tempFilePath);
                resolve(file);
            } else reject('Sticker conversion failed');
        });
    });
}

const mediaCache = {};

Function({ pattern: 'mention ?(.*)', fromMe: true, desc: 'mention msg reply', type: 'group' }, async (message, match) => {
    if (!db.database.mention_reply) db.database.mention_reply = { data: false, enabled: false };
    
    if (!match) return await message.reply('_Need input! Example: .mention hello_');
    if (match === 'on' || match === 'off') {
        db.database.mention_reply.enabled = match === 'on';
        await setDB();
        return await message.reply(`_Mention ${match === 'on' ? 'Activated' : 'Deactivated'}_`);
    }
    db.database.mention_reply.data = match;
    db.database.mention_reply.enabled = true;
    await setDB();
    return await message.reply('_Mention Updated_');
});

Function({ on: 'messages.upsert', fromMe: false }, async (message, query, client) => {
    const { data, enabled } = db.database.mention_reply || { data: false, enabled: false };
    if (!enabled || !data) return;

    const msg = message.messages[0];
    if (!msg.message) return;
    
    const m = new Message(client, msg);
    // Check if the bot was mentioned
    if (!m.mentionedJid || !m.mentionedJid.some(lid => lid.includes(client.user.id.split(':')[0]))) return;

    const typeRegex = /type\/(image|video|gif|audio|text|sticker)/;
    const match = typeRegex.exec(data);
    const type = match ? match[1] : '';
    const urls = (data.match(/http.+?(mp4|jpg|png|webp|jpeg)/g) || []);
    const randomIndex = Math.floor(Math.random() * urls.length);

    async function getMediaBuffer(url) {
        if (mediaCache[url]) return mediaCache[url];
        const buffer = await getBuffer(url);
        mediaCache[url] = buffer;
        return buffer;
    }

    let module = { mentionedJid: [m.sender] };

    if (!type) {
        const text = data.replace(/\{mention\}/g, `@${m.sender.split('@')[0]}`);
        return await client.sendMessage(m.chat, { text, mentions: [m.sender] }, { quoted: m.data });
    }

    // Media Handling
    if (type === 'audio') {
        module.audio = await getMediaBuffer(urls[randomIndex]);
        module.mimetype = 'audio/mpeg';
        module.ptt = true;
    } else if (type === 'video' || type === 'gif') {
        module.video = await getMediaBuffer(urls[randomIndex]);
        if (type === 'gif') module.gifPlayback = true;
    } else if (type === 'image') {
        module.image = await getMediaBuffer(urls[randomIndex]);
    } else if (type === 'sticker') {
        module.sticker = await toSticker(await getMediaBuffer(urls[randomIndex]));
    }

    return await client.sendMessage(m.chat, module, { quoted: m.data });
});
module.exports = { handleMentionDetection, mentionToggleCommand, setMentionCommand };
