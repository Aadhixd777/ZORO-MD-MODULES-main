const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Default Audio Direct URL
const DEFAULT_AUDIO_URL = "https://h.uguu.se/oMZcRuow.mp3,https://d.uguu.se/KZeDRhOk.mp3";

function loadState() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'mention.json'), 'utf8');
        return JSON.parse(raw);
    } catch {
        // Return default state if JSON file does not exist
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

        // External Ad Reply Context Layout
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
    return sock.sendMessage(chatId, { text: 'Set mention updated.' }, { quoted: message });
}

module.exports = { handleMentionDetection, mentionToggleCommand, setMentionCommand };
