const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

/**
 * Uploads a file to Telegra.ph and returns the permanent URL safely.
 * @param {string} filePath - Local path of the file to upload.
 * @returns {Promise<string>} - The uploaded file URL.
 */
async function uploadMediaFile(filePath) {
    let stream = null;
    try {
        const form = new FormData();
        const fileStats = fs.statSync(filePath);
        stream = fs.createReadStream(filePath);
        
        form.append('file', stream, {
            filename: path.basename(filePath),
            knownLength: fileStats.size
        });

        // Using Telegra.ph upload endpoint (Very stable and permanent)
        const response = await axios.post('https://telegra.ph/upload', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 35000
        });

        if (response.data && Array.isArray(response.data) && response.data[0]?.src) {
            return 'https://telegra.ph' + response.data[0].src;
        }
        
        // Fallback to Catbox using simpler endpoint if telegraph returns different format
        throw new Error('Telegra.ph format error');
    } catch (error) {
        console.log('[Telegra.ph Upload Failed, trying Catbox direct...]:', error.message);
        
        try {
            if (stream && typeof stream.destroy === 'function') stream.destroy();
            
            const formCatbox = new FormData();
            formCatbox.append('reqtype', 'fileupload');
            const fileStatsCatbox = fs.statSync(filePath);
            stream = fs.createReadStream(filePath);
            formCatbox.append('fileToUpload', stream, {
                filename: path.basename(filePath),
                knownLength: fileStatsCatbox.size
            });

            const resCatbox = await axios.post('https://catbox.moe/user/api.php', formCatbox, {
                headers: { ...formCatbox.getHeaders() },
                timeout: 35000
            });

            if (resCatbox.data && typeof resCatbox.data === 'string' && resCatbox.data.startsWith('http')) {
                return resCatbox.data.trim();
            }
        } catch (err2) {
            console.error('[Catbox Direct Error]:', err2.message);
        }

        throw new Error('All upload servers failed.');
    } finally {
        if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
        }
    }
}

/**
 * Safely extracts media buffer and ensures a valid extension for WhatsApp media.
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
 * Main URL command handler to convert WhatsApp media to permanent URL.
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
                text: 'Send or reply to any media (image, video, audio, sticker, document) to get a permanent URL.' 
            }, { quoted: message });
            return;
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        tempPath = path.join(tempDir, `media_${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        await sock.sendMessage(chatId, { text: '⏳ Uploading media, please wait…' }, { quoted: message });

        const fileUrl = await uploadMediaFile(tempPath);

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
