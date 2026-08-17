const { downloadContentFromMessage } = require('@aadhixd777/baileys');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

async function applyAudioEffect(sock, message, chatId, effectType) {
    let inputPath = null;
    let outputPath = null;
    
    try {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMessage || (!quotedMessage.audioMessage && !quotedMessage.voiceMessage)) {
            await sock.sendMessage(chatId, { 
                text: `❌ Please reply to an audio message with .${effectType}` 
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: '⏳ Processing audio effect...' }, { quoted: message });

        const audioMessage = quotedMessage.audioMessage || quotedMessage.voiceMessage;
        const stream = await downloadContentFromMessage(audioMessage, 'audio');
        
        const buffer = [];
        for await (const chunk of stream) {
            buffer.push(chunk);
        }
        const audioBuffer = Buffer.concat(buffer);
        
        if (audioBuffer.length > 10 * 1024 * 1024) {
            await sock.sendMessage(chatId, { text: '❌ Audio file is too large (max 10MB)' }, { quoted: message });
            return;
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        const mimetype = audioMessage.mimetype || 'audio/mpeg';
        const inputExt = mimetype.includes('ogg') ? 'ogg' : mimetype.includes('opus') ? 'opus' : 'mp3';
        
        inputPath = path.join(tempDir, `input_${timestamp}.${inputExt}`);
        outputPath = path.join(tempDir, `output_${effectType}_${timestamp}.mp3`);

        fs.writeFileSync(inputPath, audioBuffer);

        let audioFilter = '';
        switch (effectType) {
            case 'bass':
                audioFilter = 'bass=g=20,dynaudnorm';
                break;
            case 'blow':
                audioFilter = 'asetrate=44100*0.8,aresample=44100,atempo=1.25';
                break;
            case 'deep':
                audioFilter = 'asetrate=44100*0.7,aresample=44100,atempo=1.43';
                break;
            case 'errape':
                audioFilter = 'aresample=48000,asetrate=48000*1.5';
                break;
            case 'robot':
                audioFilter = 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75';
                break;
            default:
                audioFilter = 'bass=g=10';
        }

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioFilters(audioFilter)
                .audioCodec('libmp3lame')
                .audioBitrate('128k')
                .audioChannels(1)
                .save(outputPath)
                .on('end', resolve)
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                });
        });

        const outputBuffer = fs.readFileSync(outputPath);

        await sock.sendMessage(chatId, {
            audio: outputBuffer,
            mimetype: 'audio/mpeg',
            ptt: audioMessage.ptt || false
        }, { quoted: message });

    } catch (error) {
        console.error(`Error applying ${effectType} effect:`, error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to apply audio effect. Please try again.' 
        }, { quoted: message });
    } finally {
        try {
            if (inputPath && fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }
            if (outputPath && fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temp files:', cleanupError);
        }
    }
}

async function bassCommand(sock, message, chatId) {
    await applyAudioEffect(sock, message, chatId, 'bass');
}

async function blowCommand(sock, message, chatId) {
    await applyAudioEffect(sock, message, chatId, 'blow');
}

async function deepCommand(sock, message, chatId) {
    await applyAudioEffect(sock, message, chatId, 'deep');
}

async function errapeCommand(sock, message, chatId) {
    await applyAudioEffect(sock, message, chatId, 'errape');
}

async function robotCommand(sock, message, chatId) {
    await applyAudioEffect(sock, message, chatId, 'robot');
}

module.exports = {
    bassCommand,
    blowCommand,
    deepCommand,
    errapeCommand,
    robotCommand
};
