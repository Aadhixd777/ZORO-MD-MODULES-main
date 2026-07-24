const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// ✅ CUSTOM AUDIO URLs
const CUSTOM_AUDIO_URLS = [
    "https://h.uguu.se/oMZcRuow.mp3",
    "https://d.uguu.se/KZeDRhOk.mp3"
];

function loadState() {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'mention.json');
        if (!fs.existsSync(filePath)) {
            return { enabled: true, mediaUrl: CUSTOM_AUDIO_URLS[0], mediaUrls: CUSTOM_AUDIO_URLS, type: 'audio', mediaPath: null };
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const state = JSON.parse(raw);
        if (!state.mediaUrls) state.mediaUrls = CUSTOM_AUDIO_URLS;
        return state;
    } catch {
        return { enabled: true, mediaUrl: CUSTOM_AUDIO_URLS[0], mediaUrls: CUSTOM_AUDIO_URLS, type: 'audio', mediaPath: null };
    }
}

function saveState(state) {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'mention.json'), JSON.stringify(state, null, 2));
    } catch (e) { console.error('saveState error:', e?.message); }
}

async function handleMentionDetection(sock, chatId, message) {
    try {
        if (!message || !message.message) return;
        if (message.key?.fromMe) return;

        const state = loadState();
        if (!state.enabled) return;

        // 🔥 FIXED: Get Bot's clean phone number
        const botJid = sock.user?.id ? (sock.decodeJid ? sock.decodeJid(sock.user.id) : sock.user.id) : '';
        if (!botJid) return;
        const botNum = botJid.split('@')[0].split(':')[0];

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
        
        // 🔥 FIXED: Mention Detection logic
        const isMentionedInJid = mentionedJids.some(jid => jid.includes(botNum));
        const isMentionedInText = textContent.includes(`@${botNum}`);

        if (!isMentionedInJid && !isMentionedInText) return;

        console.log(`🔔 Mention detected for ${botNum}!`);

        const customThumbPath = path.join(__dirname, '..', 'media', 'custom_thumb.jpg');
        let thumbBuffer = null;
        try { if (fs.existsSync(customThumbPath)) thumbBuffer = fs.readFileSync(customThumbPath); } catch {}

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

        const urlsToTry = state.mediaUrls && state.mediaUrls.length > 0 ? state.mediaUrls : CUSTOM_AUDIO_URLS;
        const randomUrl = urlsToTry[Math.floor(Math.random() * urlsToTry.length)];
        const orderedUrls = [randomUrl, ...urlsToTry.filter(u => u !== randomUrl)];
        
        let audioBuffer = null;
        for (const url of orderedUrls) {
            try {
                console.log(`🎧 Trying audio: ${url}`);
                const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
                audioBuffer = Buffer.from(response.data);
                console.log(`✅ Audio loaded from URL`);
                break;
            } catch (e) {
                console.log(`❌ Failed loading URL audio: ${e.message}`);
            }
        }

        if (audioBuffer) {
            try {
                await sock.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true,
                    contextInfo: thumbBuffer ? adReplyContext : undefined
                }, { quoted: message });
                console.log(`✅ Mention audio sent successfully`);
                return;
            } catch (e) { console.log('Audio send error:', e.message); }
        }

        // Fallback text if audio fails
        await sock.sendMessage(chatId, {
            text: `👋 Hey! You mentioned me? I am *ZORO MD* 🔥`,
            contextInfo: thumbBuffer ? adReplyContext : undefined
        }, { quoted: message });

    } catch (err) {
        console.error('handleMentionDetection error:', err.message);
    }
}

async function mentionToggleCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || senderId.includes('918136880986');
    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Only Owner can use' }, { quoted: message });
    const onoff = (args || '').trim().toLowerCase();
    if (!['on','off'].includes(onoff)) return sock.sendMessage(chatId, { text: 'Usage: .mention on|off' }, { quoted: message });
    const state = loadState();
    state.enabled = onoff === 'on';
    saveState(state);
    return sock.sendMessage(chatId, { text: `✅ Mention ${state.enabled ? 'enabled' : 'disabled'}` }, { quoted: message });
}

async function setMentionCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || senderId.includes('918136880986');
    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Only Owner' }, { quoted: message });
    
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const qMsg = ctx?.quotedMessage;
    if (!qMsg) return sock.sendMessage(chatId, { text: '❌ Reply to audio with .setmention' }, { quoted: message });

    let type, dataType;
    if (qMsg.audioMessage) { dataType = 'audioMessage'; type = 'audio'; }
    else if (qMsg.imageMessage) { dataType = 'imageMessage'; type = 'image'; }
    else if (qMsg.videoMessage) { dataType = 'videoMessage'; type = 'video'; }
    else return sock.sendMessage(chatId, { text: '❌ Unsupported' }, { quoted: message });

    let buf;
    try {
        const media = qMsg[dataType];
        const stream = await downloadContentFromMessage(media, type);
        const chunks = []; for await (const chunk of stream) chunks.push(chunk);
        buf = Buffer.concat(chunks);
    } catch { return sock.sendMessage(chatId, { text: '❌ Download failed' }, { quoted: message }); }

    const mediaDir = path.join(__dirname, '..', 'media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    const outPath = path.join(mediaDir, 'mention_custom.mp3');
    fs.writeFileSync(outPath, buf);

    const state = loadState();
    state.mediaPath = path.join('media', 'mention_custom.mp3');
    saveState(state);
    return sock.sendMessage(chatId, { text: '✅ Mention audio updated!' }, { quoted: message });
}

module.exports = { handleMentionDetection, mentionToggleCommand, setMentionCommand };
