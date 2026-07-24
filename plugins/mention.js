const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const CUSTOM_AUDIO_URLS = [
    "https://d.uguu.se/aapEeDmk.mp3",
    "https://n.uguu.se/GDyfKpaU.mp3"
];

const OWNER_NUMBER = "918136880986"; 
const INSTAGRAM_URL = "https://www.instagram.com/aadhi.x._______________?igsh=MWd5a21oeGtpZzNqYw==";

function loadState() {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'mention.json');
        if (!fs.existsSync(filePath)) {
            return { enabled: true, mediaUrls: CUSTOM_AUDIO_URLS, type: 'audio', mediaPath: null };
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const state = JSON.parse(raw);
        if (!state.mediaUrls || !Array.isArray(state.mediaUrls) || state.mediaUrls.length === 0) {
            state.mediaUrls = CUSTOM_AUDIO_URLS;
        }
        return state;
    } catch {
        return { enabled: true, mediaUrls: CUSTOM_AUDIO_URLS, type: 'audio', mediaPath: null };
    }
}

function saveState(state) {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'mention.json'), JSON.stringify(state, null, 2));
    } catch (e) {
        console.error('saveState error:', e?.message);
    }
}

async function handleMentionDetection(sock, chatId, message) {
    try {
        if (!message || !message.message) return;
        if (message.key?.fromMe) return;

        const state = loadState();
        if (!state.enabled) return;

        const targetChat = message.key?.remoteJid || chatId;
        if (!targetChat) return;

        const botUser = sock.user;
        const botJid = botUser?.id ? (sock.decodeJid ? sock.decodeJid(botUser.id) : botUser.id) : '';
        const botLid = botUser?.lid || ''; 

        const botNum = botJid.split('@')[0].split(':')[0];
        const botLidNum = botLid ? botLid.split('@')[0].split(':')[0] : '';
        const ownerNum = OWNER_NUMBER;

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
        
        const isBotMentioned = mentionedJids.some(jid => {
            return (botNum && jid.includes(botNum)) || 
                   (botLidNum && jid.includes(botLidNum));
        }) || (botNum && textContent.includes(`@${botNum}`)) || (botLidNum && textContent.includes(`@${botLidNum}`));

        const isOwnerMentioned = mentionedJids.some(jid => jid.includes(ownerNum)) || textContent.includes(`@${ownerNum}`);

        if (!isBotMentioned && !isOwnerMentioned) return;

        console.log(`Mention detected for ${isBotMentioned ? 'Bot' : 'Owner'} in chat: ${targetChat}`);

        let localAudioBuffer = null;
        if (state.mediaPath) {
            const fullLocalPath = path.join(__dirname, '..', state.mediaPath);
            if (fs.existsSync(fullLocalPath)) {
                try {
                    localAudioBuffer = fs.readFileSync(fullLocalPath);
                } catch (e) {
                    console.log('Failed to read local media:', e.message);
                }
            }
        }

        const customThumbPath = path.join(__dirname, '..', 'media', 'custom_thumb.jpg');
        let thumbBuffer = null;
        try { 
            if (fs.existsSync(customThumbPath)) thumbBuffer = fs.readFileSync(customThumbPath); 
        } catch {}

        // 🎯 FIX: തംബ്നൈലിൽ ടാപ്പ് ചെയ്യുമ്പോൾ ഇൻസ്റ്റാഗ്രാമിലേക്ക് ലിങ്ക് ബോക്സ് വഴിയുള്ള റീഡയറക്ട്
        const adReplyContext = {
            externalAdReply: {
                title: "ZORO MD OFFICIAL",
                body: "Click to visit Instagram Profile",
                showAdAttribution: true,
                renderLargerThumbnail: true,
                thumbnail: thumbBuffer,
                mediaType: 2, // 🎯 FIX: ക്ലിക്ക് ചെയ്യുമ്പോൾ റീഡയറക്ട് ഉറപ്പാക്കാൻ 2 നൽകി
                mediaUrl: INSTAGRAM_URL,
                sourceUrl: INSTAGRAM_URL
            }
        };

        let audioBuffer = localAudioBuffer;

        if (!audioBuffer) {
            const urlsToTry = state.mediaUrls && state.mediaUrls.length > 0 ? state.mediaUrls : CUSTOM_AUDIO_URLS;
            const randomUrl = urlsToTry[Math.floor(Math.random() * urlsToTry.length)];
            const orderedUrls = [randomUrl, ...urlsToTry.filter(u => u !== randomUrl)];

            for (const url of orderedUrls) {
                try {
                    console.log(`Trying audio URL: ${url}`);
                    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
                    if (response.data && response.data.byteLength > 0) {
                        audioBuffer = Buffer.from(response.data);
                        console.log(`Audio loaded from URL successfully`);
                        break;
                    }
                } catch (e) {
                    console.log(`Failed loading URL audio: ${e.message}`);
                }
            }
        }

        if (audioBuffer) {
            try {
                // 🎯 FIX: mimetype 'audio/mpeg' ആക്കിയതും ptt: false നൽകിയതും മൂലം വോയിസ് നോട്ട് മാറി സാധാ MP3 ആയി പോകും
                await sock.sendMessage(targetChat, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    contextInfo: thumbBuffer ? adReplyContext : undefined
                }, { quoted: message });
                console.log(`Mention audio sent successfully`);
                return;
            } catch (e) { 
                console.log('Audio send error:', e.message);
            }
        }

        await sock.sendMessage(targetChat, {
            text: `👋 Hey! You mentioned me? I am *ZORO MD* 🔥`,
            contextInfo: thumbBuffer ? adReplyContext : undefined
        }, { quoted: message });

    } catch (err) {
        console.error('handleMentionDetection error:', err.message);
    }
}

async function mentionToggleCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || senderId.includes(OWNER_NUMBER);
    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Only Owner can use this command.' }, { quoted: message });

    const onoff = (args || '').trim().toLowerCase();
    if (!['on','off'].includes(onoff)) return sock.sendMessage(chatId, { text: 'Usage: .mention on|off' }, { quoted: message });

    const state = loadState();
    state.enabled = onoff === 'on';
    saveState(state);
    return sock.sendMessage(chatId, { text: `✅ Mention reply ${state.enabled ? 'enabled' : 'disabled'}` }, { quoted: message });
}

async function setMentionCommand(sock, chatId, message) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || senderId.includes(OWNER_NUMBER);
    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Only Owner can use this command.' }, { quoted: message });

    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const qMsg = ctx?.quotedMessage;
    if (!qMsg) return sock.sendMessage(chatId, { text: '❌ Reply to an audio with .setmention' }, { quoted: message });

    let type, dataType;
    if (qMsg.audioMessage) { dataType = 'audioMessage'; type = 'audio'; }
    else if (qMsg.imageMessage) { dataType = 'imageMessage'; type = 'image'; }
    else if (qMsg.videoMessage) { dataType = 'videoMessage'; type = 'video'; }
    else return sock.sendMessage(chatId, { text: '❌ Unsupported media type.' }, { quoted: message });

    let buf;
    try {
        const media = qMsg[dataType];
        const stream = await downloadContentFromMessage(media, type);
        const chunks = []; 
        for await (const chunk of stream) chunks.push(chunk);
        buf = Buffer.concat(chunks);
    } catch { 
        return sock.sendMessage(chatId, { text: '❌ Media download failed.' }, { quoted: message }); 
    }

    const mediaDir = path.join(__dirname, '..', 'media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    const outPath = path.join(mediaDir, 'mention_custom.mp3');
    fs.writeFileSync(outPath, buf);

    const state = loadState();
    state.mediaPath = path.join('media', 'mention_custom.mp3');
    saveState(state);
    return sock.sendMessage(chatId, { text: '✅ Mention audio updated successfully!' }, { quoted: message });
}

module.exports = { handleMentionDetection, mentionToggleCommand, setMentionCommand };
