const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

/**
 * Uploads a file to Catbox.moe or fallback server and returns the permanent URL safely.
 * @param {string} filePath - Local path of the file to upload.
 * @returns {Promise<string>} - The uploaded file URL.
 */
async function uploadMediaFile(filePath) {
    let stream = null;
    try {
        // Attempt 1: Catbox.moe
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        
        const fileStats = fs.statSync(filePath);
        stream = fs.createReadStream(filePath);
        
        form.append('fileToUpload', stream, {
            filename: path.basename(filePath),
            knownLength: fileStats.size
        });

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 35000
        });

        if (response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
            return response.data.trim();
        }
        throw new Error('Invalid Catbox response');
    } catch (error) {
        console.log('[Catbox Upload Failed, trying alternative...]:', error.response?.data || error.message);
        
        // Attempt 2: Fallback to AnonFiles / FileIO / Quax if Catbox fails
        try {
            if (stream && typeof stream.destroy === 'function') stream.destroy();
            
            const formFallback = new FormData();
            const fileStatsFallback = fs.statSync(filePath);
            stream = fs.createReadStream(filePath);
            
            formFallback.append('file', stream, {
                filename: path.basename(filePath),
                knownLength: fileStatsFallback.size
            });

            const resFallback = await axios.post('https://qu.ax/upload.php', formFallback, {
                headers: { ...formFallback.getHeaders() },
                timeout: 35000
            });

            if (resFallback.data && resFallback.data.success) {
                return resFallback.data.files[0].url;
            }
        } catch (err2) {
            console.error('[Fallback Upload Error]:', err2.message);
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
