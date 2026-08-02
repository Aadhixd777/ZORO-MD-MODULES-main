const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function handleMediaUpload(filePath) {
    let stream = null;
    try {
        const form = new FormData();
        const fileStats = fs.statSync(filePath);
        stream = fs.createReadStream(filePath);
        
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", stream, {
            filename: path.basename(filePath),
            knownLength: fileStats.size
        });

        const response = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000
        });

        if (response.data) {
            return response.data.trim();
        }
        
        throw new Error('Upload failed: Invalid response from server');
    } catch (error) {
        throw new Error(error.response?.data?.error || error.message);
    } finally {
        if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
        }
    }
}

async function getMediaBufferAndExt(message) {
    const content = message.message || {};
    let type = null;
    let msgContent = null;
    let defaultExt = '.bin';

    if (content.imageMessage) { type = 'image'; msgContent = content.imageMessage; defaultExt = '.jpg'; }
    else if (content.videoMessage) { type = 'video'; msgContent = content.videoMessage; defaultExt = '.mp4'; }
    else if (content.audioMessage) { type = 'audio'; msgContent = content.audioMessage; defaultExt = '.mp3'; }
    else if (content.documentMessage) { type = 'document'; msgContent = content.documentMessage; defaultExt = path.extname(content.documentMessage.fileName || '') || '.bin'; }
    else if (content.stickerMessage) { type = 'sticker'; msgContent = content.stickerMessage; defaultExt = '.webp'; }

    if (!type || !msgContent) return null;

    const stream = await downloadContentFromMessage(msgContent, type);
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return { buffer: Buffer.concat(chunks), ext: defaultExt };
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
                text: 'Please reply to an Image, Video, Audio, Document or Sticker to get a permanent URL.' 
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

        await sock.sendMessage(chatId, { text: `Permanent URL: ${mediaUrl}` }, { quoted: message });
    } catch (error) {
        console.error('Error in url command:', error);
        try { await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } }); } catch {}
        await sock.sendMessage(chatId, { text: `Failed to upload media: ${error.message}` }, { quoted: message });
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
