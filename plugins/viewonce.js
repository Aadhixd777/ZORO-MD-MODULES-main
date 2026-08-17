const { downloadContentFromMessage } = require('@@aadhixd777/baileys');

async function viewonceCommand(sock, chatId, message) {
    // Extract quoted message
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;
    const quotedAudio = quoted?.audioMessage; // 🔹 Qaybta cusub ee audio-ga

    if (quotedImage && quotedImage.viewOnce) {
        // Download and send the image
        const stream = await downloadContentFromMessage(quotedImage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(chatId, { image: buffer, fileName: 'media.jpg', caption: quotedImage.caption || '' }, { quoted: message });
    } 
    else if (quotedVideo && quotedVideo.viewOnce) {
        // Download and send the video
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        await sock.sendMessage(chatId, { video: buffer, fileName: 'media.mp4', caption: quotedVideo.caption || '' }, { quoted: message });
    } 
    else if (quotedAudio) { // 🔹 Audio check
        // Download and send the audio
        const stream = await downloadContentFromMessage(quotedAudio, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        
        // Haddii uu yahay voice note (PTT), waa in type = "ptt" lagu diraa
        const isPTT = quotedAudio.ptt || false;
        const mimetype = quotedAudio.mimetype || 'audio/ogg; codecs=opus';

        await sock.sendMessage(chatId, { audio: buffer, mimetype, ptt: isPTT, fileName: 'audio.ogg' }, { quoted: message });
    }
    else {
        await sock.sendMessage(chatId, { text: '❌ Please reply to an image, video, or audio!.' }, { quoted: message });
    }
}

module.exports = viewonceCommand;
