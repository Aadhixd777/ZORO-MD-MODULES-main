const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');

async function textstickerCommand(sock, chatId, message, text) {
    if (!text || text.trim() === '') {
        await sock.sendMessage(chatId, {
            text: `╭──❍「 *TEXT TO STICKER* 」❍
│ 
│ *Usage:* .textsticker <text>
│ 
│ *Examples:*
│ ➤ .textsticker Hello World
│ ➤ .textsticker ZORO MD
│ ➤ .textsticker 🔥 Aadhixd
│
│ Converts any text into a sticker!
│ Text will be shown on a transparent background.
│
╰─────────❍`
        }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(chatId, {
            text: '⏳ Converting text to sticker...'
        }, { quoted: message });

        const imageBuffer = await createTextImage(text.trim());

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const tempInput = path.join(tmpDir, `text_${Date.now()}.png`);
        const tempWebp = path.join(tmpDir, `text_webp_${Date.now()}.webp`);

        fs.writeFileSync(tempInput, imageBuffer);

        await convertToWebp(tempInput, tempWebp);

        let stickerBuffer = fs.readFileSync(tempWebp);

        const img = new webp.Image();
        const json = {
            "sticker-pack-id": "ZORO.md",
            "sticker-pack-name": "ZORO MD Text",
            "sticker-pack-publisher": "Aadhixd",
            "emojis": ["📝", "💬"]
        };
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);
        
        await img.load(tempWebp);
        img.exif = exif;
        
        const finalOutput = path.join(tmpDir, `text_final_${Date.now()}.webp`);
        await img.save(finalOutput);
        
        stickerBuffer = fs.readFileSync(finalOutput);

        await sock.sendMessage(chatId, {
            sticker: stickerBuffer
        }, { quoted: message });

        try {
            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempWebp);
            fs.unlinkSync(finalOutput);
        } catch (cleanupError) {
            console.error('Error cleaning up temp files:', cleanupError);
        }

    } catch (error) {
        console.error('Error in textsticker command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Error creating text sticker!*\n\nPlease try again or use shorter text.'
        }, { quoted: message });
    }
}

function createTextImage(text) {
    return new Promise((resolve, reject) => {
        const fontPath = process.platform === 'win32'
            ? 'C:/Windows/Fonts/arialbd.ttf'
            : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

        const escapeDrawtextText = (s) => s
            .replace(/\\/g, '\\\\\\\\')
            .replace(/:/g, '\\:')
            .replace(/,/g, '\\,')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '');

        const safeText = escapeDrawtextText(text);
        const safeFontPath = process.platform === 'win32'
            ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
            : fontPath;

        const args = [
            '-y',
            '-f', 'lavfi',
            '-i', 'color=c=#00000000:s=512x512',
            '-vf', `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=white:fontsize=56:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`,
            '-frames:v', '1',
            '-f', 'image2',
            'pipe:1'
        ];

        const ff = spawn('ffmpeg', args);
        const chunks = [];
        const errors = [];
        
        ff.stdout.on('data', d => chunks.push(d));
        ff.stderr.on('data', e => errors.push(e));
        ff.on('error', reject);
        ff.on('close', code => {
            if (code === 0) {
                return resolve(Buffer.concat(chunks));
            }
            reject(new Error(Buffer.concat(errors).toString() || `ffmpeg exited with code ${code}`));
        });
    });
}

function convertToWebp(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const args = [
            '-i', inputPath,
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
            '-c:v', 'libwebp',
            '-preset', 'default',
            '-loop', '0',
            '-vsync', '0',
            '-pix_fmt', 'yuva420p',
            '-quality', '75',
            '-compression_level', '6',
            outputPath
        ];

        const ff = spawn('ffmpeg', args);
        const errors = [];
        
        ff.stderr.on('data', e => errors.push(e));
        ff.on('error', reject);
        ff.on('close', code => {
            if (code === 0) {
                return resolve();
            }
            reject(new Error(Buffer.concat(errors).toString() || `ffmpeg exited with code ${code}`));
        });
    });
}

module.exports = textstickerCommand;
