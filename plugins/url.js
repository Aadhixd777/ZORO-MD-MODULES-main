const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

/**
 * Uploads a file to Catbox.moe and returns the permanent URL.
 * @param {string} filePath - Local path of the file to upload.
 * @returns {Promise<string>} - The uploaded file URL.
 */
async function catboxUpload(filePath) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        // ഫയലിന്റെ പേര് കൂടി ഇവിടെ നൽകിയിരിക്കുന്നു (412 എറർ ഒഴിവാക്കാൻ ഇത് സഹായിക്കും)
        form.append('fileToUpload', fs.createReadStream(filePath), path.basename(filePath));

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        return response.data;
    } catch (error) {
        console.error('[Catbox Upload Error]:', error.response?.data || error.message);
        throw new Error('Catbox upload failed: ' + (error.message || error));
    }
}

/**
 * Extracts media buffer and file extension from a WhatsApp message object.
 * @param {Object} message - The WhatsApp message object.
 * @returns {Promise<{buffer: Buffer, ext: string}|null>}
 */
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

/**
 * Extracts media from a quoted message if present.
 * @param {Object} message - The WhatsApp message object containing contextInfo.
 * @returns {Promise<{buffer: Buffer, ext: string}|null>}
 */
async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

/**
 * Main URL command handler to convert WhatsApp media to permanent Catbox link.
 * @param {Object} sock - Baileys socket instance.
 * @param {string} chatId - Target chat ID.
 * @param {Object} message - Incoming message object.
 */
async function urlCommand(sock, chatId, message) {
    let tempPath = '';
    try {
        let media = await getMediaBufferAndExt(message);
        if (!media) {
            media = await getQuotedMediaBufferAndExt(message);
        }

        if (!media) {
            await sock.sendMessage(chatId, { 
                text: 'Send or reply to a media (image, video, audio, sticker, document) to get a URL.' 
            }, { quoted: message });
            return;
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        tempPath = path.join(tempDir, `${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        await sock.sendMessage(chatId, { text: '⏳ Uploading media to Catbox, please wait…' }, { quoted: message });

        const fileUrl = await catboxUpload(tempPath);

        if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
            await sock.sendMessage(chatId, { text: '❌ Failed to upload media. Invalid response from server.' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: `✅ *Permanent URL:* ${fileUrl.trim()}` }, { quoted: message });
    } catch (error) {
        console.error('[URL Command Error]:', error?.message || error);
        await sock.sendMessage(chatId, { text: '❌ Failed to convert media to URL.' }, { quoted: message });
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            setTimeout(() => {
                try { 
                    fs.unlinkSync(tempPath); 
                } catch (err) {
                    console.error('[Temp File Cleanup Error]:', err);
                }
            }, 2000);
        }
    }
}

module.exports = urlCommand;
