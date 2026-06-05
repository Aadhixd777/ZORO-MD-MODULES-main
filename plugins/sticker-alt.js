const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// --- 18+ Filter Function ---
async function isAdultContent(buffer) {
    try {
        let data = new FormData();
        data.append('media', buffer, 'media.jpg');
        data.append('models', 'nudity-2.0');
        
        // Make sure to add your API credentials below!
        data.append('api_user', '6605193'); 
        data.append('api_secret', '36aVQRhqWikHjcVTQgXGgaxuYiehn6Ui');

        let response = await axios({
            method: 'post',
            url: 'https://api.sightengine.com/1.0/check.json',
            data: data,
            headers: data.getHeaders()
        });

        if (response.data.status === 'success') {
            const safeScore = response.data.nudity.none;
            // If the safe score is less than 0.5 (50%), it might be 18+
            if (safeScore < 0.5) {
                return true; // Is 18+ content
            }
        }
        return false; // Is safe
    } catch (error) {
        console.error('NSFW API Error:', error.message);
        return false; // Fail safe (allow if API errors out)
    }
}
// --------------------------

async function stickerCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            await sock.sendMessage(chatId, { text: 'Please reply to an image or video!' });
            return;
        }

        const type = Object.keys(quotedMsg)[0];
        if (!['imageMessage', 'videoMessage'].includes(type)) {
            await sock.sendMessage(chatId, { text: 'Please reply to an image or video!' });
            return;
        }

        const stream = await downloadContentFromMessage(quotedMsg[type], type.split('Message')[0]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // ---- Safety Check ----
        await sock.sendMessage(chatId, { text: '🔍 Checking media for safety...' }, { quoted: message });
        
        const is18Plus = await isAdultContent(buffer);
        
        if (is18Plus) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Sorry!* The bot does not allow creating stickers from 18+ content for safety reasons.' 
            }, { quoted: message });
            return; // Stop if 18+
        }
        // ----------------------

        const tempInput = `./temp/temp_${Date.now()}.${type === 'imageMessage' ? 'jpg' : 'mp4'}`;
        const tempOutput = `./temp/sticker_${Date.now()}.webp`;

        // Create temp directory if it doesn't exist
        if (!fs.existsSync('./temp')) {
            fs.mkdirSync('./temp', { recursive: true });
        }

        fs.writeFileSync(tempInput, buffer);

        // Convert to WebP using ffmpeg
        await new Promise((resolve, reject) => {
            const cmd = type === 'imageMessage' 
                ? `ffmpeg -i "${tempInput}" -vf "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease" "${tempOutput}"`
                : `ffmpeg -i "${tempInput}" -vf "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease" -c:v libwebp -preset default -loop 0 -vsync 0 -t 6 "${tempOutput}"`;
            
            exec(cmd, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        await sock.sendMessage(chatId, { 
            sticker: fs.readFileSync(tempOutput) 
        });

        // Cleanup
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);

    } catch (error) {
        console.error('Error in sticker command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to create sticker!' });
    }
}

module.exports = stickerCommand;
