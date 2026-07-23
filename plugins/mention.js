const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Default Audio Direct URL (Replace with your direct audio link if needed)
const DEFAULT_AUDIO_URL = "https://files.catbox.moe/your_audio.mp3";

function loadState() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'mention.json'), 'utf8');
        return JSON.parse(raw);
    } catch {
        // Default state if JSON file does not exist
        return { enabled: true, mediaUrl: DEFAULT_AUDIO_URL, type: 'audio' };
    }
}

function saveState(state) {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(path.join(dataDir, 'mention.json'), JSON.stringify(state, null, 2));
    } catch (e) {
        console.error('saveState error:', e?.message || e);
    }
}

async function handleMentionDetection(sock, chatId, message) {
    try {
        if (!message || !message.message) return;
        if (message.key?.fromMe) return;

        const state = loadState();
        if (!state.enabled) return;

        const rawId = sock.user?.id || sock.user?.jid || '';
        if (!rawId) return;
        const botNum = rawId.split('@')[0].split(':')[0];

        const msg = message.message || {};
        let mentionedJids = [];
        const contextInfo = msg.extendedTextMessage?.contextInfo || 
                            msg.imageMessage?.contextInfo || 
                            msg.videoMessage?.contextInfo || 
                            msg.audioMessage?.contextInfo || 
                            msg.stickerMessage?.contextInfo;

        if (contextInfo && Array.isArray(contextInfo.mentionedJid)) {
            mentionedJids = contextInfo.mentionedJid;
        }

        const textContent = (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '').toString();
        
        const isMentionedInJid = mentionedJids.some(jid => jid.includes(botNum));
        const isMentionedInText = textContent.includes(`@${botNum}`);

        if (!isMentionedInJid && !isMentionedInText) return;

        // Custom thumbnail image path
        const customThumbPath = path.join(__dirname, '..', 'media', 'custom_thumb.jpg');
        let thumbBuffer = null;
        if (fs.existsSync(customThumbPath)) {
            thumbBuffer = fs.readFileSync(customThumbPath);
        }

        // External Ad Reply Context Layout (Redirects to Instagram profile)
        const adReplyContext = {
            externalAdReply: {
                title: "ZORO MD OFFICIAL",
                body: "Mention Detector",
                showAdAttribution: true,
                renderLargerThumbnail: true,
                thumbnail: thumbBuffer,
                mediaType: 1,
                sourceUrl: "https://www.instagram.com/aadhi.x._______________"
            }
        };

        const audioUrl = state.mediaUrl || DEFAULT_AUDIO_URL;
        const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(response.data);

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: true,
            contextInfo: thumbBuffer ? adReplyContext : undefined
        }, { quoted: message });

    } catch (err) {
        console.error('handleMentionDetection error:', err);
    }
}

async function mentionToggleCommand(sock, chatId, message, args, isOwner) {
    if (!isOwner) return sock.sendMessage(chatId, { text: 'Only Owner or Sudo can use this command.' }, { quoted: message });
    const onoff = (args || '').trim().toLowerCase();
    if (!onoff || !['on', 'off'].includes(onoff)) {
        return sock.sendMessage(chatId, { text: 'Usage: .mention on|off' }, { quoted: message });
    }
    const state = loadState();
    state.enabled = onoff === 'on';
    saveState(state);
    return sock.sendMessage(chatId, { text: `Mention reply ${state.enabled ? 'enabled' : 'disabled'}.` }, { quoted: message });
}

async function setMentionCommand(sock, chatId, message, isOwner) {
    if (!isOwner) return sock.sendMessage(chatId, { text: 'Only Owner or Sudo can use this command.' }, { quoted: message });
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const qMsg = ctx?.quotedMessage;
    if (!qMsg) return sock.sendMessage(chatId, { text: 'Reply to an audio, sticker, image or video.' }, { quoted: message });

    let type = 'text', buf, dataType;
    if (qMsg.stickerMessage) { dataType = 'stickerMessage'; type = 'sticker'; }
    else if (qMsg.imageMessage) { dataType = 'imageMessage'; type = 'image'; }
    else if (qMsg.videoMessage) { dataType = 'videoMessage'; type = 'video'; }
    else if (qMsg.audioMessage) { dataType = 'audioMessage'; type = 'audio'; }
    else if (qMsg.conversation || qMsg.extendedTextMessage?.text) { type = 'text'; }
    else return sock.sendMessage(chatId, { text: 'Unsupported media type.' }, { quoted: message });

    if (type === 'text') {
        buf = Buffer.from(qMsg.conversation || qMsg.extendedTextMessage?.text || '', 'utf8');
    } else {
        try {
            const media = qMsg[dataType];
            const kind = type === 'sticker' ? 'sticker' : type;
            const stream = await downloadContentFromMessage(media, kind);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            buf = Buffer.concat(chunks);
        } catch (e) {
            console.error('download error', e);
            return sock.sendMessage(chatId, { text: 'Failed to download media.' }, { quoted: message });
        }
    }

    // Updated File Size Limit: 10 MB (10 * 1024 * 1024)
    if (buf.length > 10 * 1024 * 1024) {
        return sock.sendMessage(chatId, { text: 'File too large. Max limit is 10 MB.' }, { quoted: message });
    }

    let mimetype = qMsg[dataType]?.mimetype || 'audio/mp4';
    let ptt = typeof qMsg.audioMessage?.ptt === 'boolean' ? qMsg.audioMessage.ptt : true;
    let ext = type === 'audio' ? 'mp3' : type === 'image' ? 'jpg' : type === 'sticker' ? 'webp' : 'txt';

    const mediaDir = path.join(__dirname, '..', 'media');
    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
    }

    const outName = `mention_custom.${ext}`;
    const outPath = path.join(mediaDir, outName);
    fs.writeFileSync(outPath, buf);

    const state = loadState();
    state.mediaPath = path.join('media', outName);
    state.type = type;
    state.mimetype = mimetype;
    state.ptt = ptt;
    saveState(state);

    return sock.sendMessage(chatId, { text: 'Mention reply media updated successfully!' }, { quoted: message });
}

module.exports = { handleMentionDetection, mentionToggleCommand, setMentionCommand };
