const fs = require('fs');
const sharp = require('sharp');
const { downloadContentFromMessage } = require('@aadhixd777/baileys');

async function picCommand(sock, chatId, message, quoted) {
    // 1. Check if the quoted message exists and is a sticker
    if (!quoted || !quoted.stickerMessage) {
        return await sock.sendMessage(chatId, { text: "❌ Please reply to a sticker!" }, { quoted: message });
    }

    try {
        const timestamp = Date.now();
        const outputPath = `./temp/sticker_${timestamp}.png`;

        // Create the temp folder if it doesn't exist
        if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

        // 2. Download the sticker content
        const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        // 3. Use Sharp to convert the static or animated sticker to PNG
        await sharp(buffer)
            .png()
            .toFile(outputPath);

        // 4. Send the converted image to the user
        await sock.sendMessage(chatId, { 
            image: fs.readFileSync(outputPath), 
            caption: "✅ Converted successfully!" 
        }, { quoted: message });

        // 5. Cleanup: Delete the temporary file after sending
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    } catch (e) {
        console.error('Error in picCommand:', e);
        await sock.sendMessage(chatId, { text: "❌ Error: Could not convert this sticker. It might be corrupted." }, { quoted: message });
    }
}

module.exports = picCommand;
