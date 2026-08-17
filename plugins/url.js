const { downloadContentFromMessage } = require('@aadhixd777/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function UploadFileTmpFiles(filePath) {
    let stream = null;
    try {
        const form = new FormData();
        const fileStats = fs.statSync(filePath);
        
        stream = fs.createReadStream(filePath);
        form.append("file", stream, {
            filename: path.basename(filePath),
            knownLength: fileStats.size
        });

        const response = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: { 
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000
        });

        if (response.data && response.data.status === 'success') {
            let rawUrl = response.data.data.url;
            let finalUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            return finalUrl;
        }
        throw new Error('Invalid response from server');
    } catch (error) {
        throw new Error(error.response?.data?.error || error.message);
    } finally {
        if (stream && !stream.destroyed && typeof stream.destroy === 'function') {
            stream.destroy();
        }
    }
}

async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
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
    try {
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, { text: 'Send or reply to a media (image, video, audio, sticker, document) to get a permanent URL.' }, { quoted: message });
            return;
        }

        try { await sock.sendMessage(chatId, { react: { text: "⏫", key: message.key } }); } catch {}

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, `${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        let url = '';
        try {
            url = await UploadFileTmpFiles(tempPath);
        } finally {
            setTimeout(() => {
                try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
            }, 2000);
        }

        if (!url) {
            await sock.sendMessage(chatId, { text: 'Failed to upload media.' }, { quoted: message });
            return;
        }

        try { await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } }); } catch {}
        await sock.sendMessage(chatId, { text: `Permanent URL: ${url}` }, { quoted: message });
    } catch (error) {
        console.error('[URL] error:', error?.message || error);
        try { await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } }); } catch {}
        await sock.sendMessage(chatId, { text: `Failed to convert media to URL: ${error?.message || error}` }, { quoted: message });
    }
}

module.exports = urlCommand;
