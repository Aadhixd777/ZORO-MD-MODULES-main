const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function handleMediaUpload(filePath) {
    let stream = null;
    try {
        const form = new FormData();
        const fileStats = fs.statSync(filePath);
        stream = fs.createReadStream(filePath);
        
        form.append("file", stream, {
            filename: path.basename(filePath),
            knownLength: fileStats.size
        });

        const response = await axios.post("https://telegra.ph/upload", form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 45000
        });

        if (response.data && Array.isArray(response.data) && response.data[0]?.src) {
            return "https://telegra.ph" + response.data[0].src;
        }
        throw new Error('Upload failed');
    } catch (error) {
        throw new Error(error.message);
    } finally {
        if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
        }
    }
}

async function getMediaBufferAndExt(message) {
    const content = message.message || {};

    if (content.imageMessage) {
        const stream = await downloadContentFromMessage(content.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }

    if (content.videoMessage) {
        const stream = await downloadContentFromMessage(content.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }

    if (content.audioMessage) {
        const stream = await downloadContentFromMessage(content.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }

    if (content.documentMessage) {
        const stream = await downloadContentFromMessage(content.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = content.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }

    if (content.stickerMessage) {
        const stream = await downloadContentFromMessage(content.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp' };
    }

    return null;
}

async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

async function urlCommand(sock, chatId, message) {
    let tempPath = '';
    try {
        let media = await getMediaBufferAndExt(message);
        if (!media) {
            media = await getQuotedMediaBufferAndExt(message);
        }

        if (!media) {
            await sock.sendMessage(chatId, { 
                text: '❌ Reply to an Image/Video/Audio' 
            }, { quoted: message });
            return;
        }

        try { await sock.sendMessage(chatId, { react: { text: "⏫", key: message.key } }); } catch {}

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        tempPath = path.join(tempDir, `media_${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        const mediaUrl = await handleMediaUpload(tempPath);

        try { await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } }); } catch {}

        await sock.sendMessage(chatId, { text: mediaUrl }, { quoted: message });
    } catch (error) {
        try { await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } }); } catch {}
        await sock.sendMessage(chatId, { text: 'An error occurred while uploading the media.' }, { quoted: message });
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            setTimeout(() => {
                try { 
                    fs.unlinkSync(tempPath); 
                } catch (err) {}
            }, 2000);
        }
    }
}

module.exports = urlCommand;
