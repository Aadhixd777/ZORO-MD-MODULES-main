const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

async function songCommand(sock, chatId, message) {
    let tempFilePath = null;
    let actualFilePath = null;
    
    // ഉപയോക്താവ് നൽകിയ കമാൻഡ് ടെക്സ്റ്റ് സുരക്ഷിതമായി വേർതിരിച്ചെടുക്കുന്നു
    const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.imageMessage?.caption || message.message?.videoMessage?.caption || '';
    const queryText = fullText.split(' ').slice(1).join(' ').trim();

    if (!queryText) {
        return await sock.sendMessage(chatId, { 
            text: '⭐ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        let processingMsg = await sock.sendMessage(chatId, { 
            text: `🔍 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐒𝐄𝐀𝐑𝐂𝐇𝐈НГ* 🔍\n\n» *Query:* \`${queryText}\`\n» *Status:* 📡 Connecting to YouTube via yt-dlp...` 
        }, { quoted: message });

        const searchResults = await yts(queryText);
        const videos = searchResults?.videos;
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: "❌ *Oops!* No songs found!" }, { quoted: message });
        }
        
        const video = videos[0];

        await sock.sendMessage(chatId, { 
            text: `🎵 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂* 🎵\n\n📝 *Title:* ${video.title}\n📥 *Status:* ⚡ Downloading high-quality MP3...`,
            edit: processingMsg.key
        });

        const uniqueId = `zoro_${Date.now()}`;
        tempFilePath = path.join(__dirname, `${uniqueId}.mp3`);

        // പ്രധാന yt-dlp ഡൗൺലോഡ്
        await youtubedl(video.url, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '0',
            output: tempFilePath,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: [
                'referer:https://www.youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        const dirFiles = fs.readdirSync(__dirname);
        const downloadedFile = dirFiles.find(file => file.startsWith(uniqueId));

        if (!downloadedFile) {
            throw new Error('yt-dlp failed to generate output file.');
        }

        actualFilePath = path.join(__dirname, downloadedFile);
        const audioBuffer = fs.readFileSync(actualFilePath);

        await sock.sendMessage(chatId, { 
            text: `🚀 *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐔𝐏𝐋𝐎𝐀𝐃𝐈𝐍𝐆* 🚀\n\n» *Song:* ${video.title}\n» *Status:* 📤 Pushing audio to chat...`,
            edit: processingMsg.key
        });

        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, { 
            text: `✅ *𝐙𝐎𝐑𝐎-𝐌𝐃 𝐌𝐔𝐒𝐈𝐂 𝐃𝐄𝐋𝐈𝐕𝐄𝐑𝐄𝐃* ✅\n\n🎶 *${video.title}*`, 
            edit: processingMsg.key 
        });
        
        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        console.error('Zoro MD Pro Song Error:', err.message);
        
        // സെക്കൻഡറി ഫോൾബാക്ക് (Alternative Attempt) - `queryText` സുരക്ഷിതമായി ഉപയോഗിച്ചിരിക്കുന്നു
        try {
            await sock.sendMessage(chatId, { text: `⚠️ Initial method skipped, trying alternative high-speed stream...` }, { quoted: message });
            
            const searchResults = await yts(queryText);
            const video = searchResults?.videos?.[0];
            if (!video) throw new Error('Backup search failed');

            const backupId = `backup_${Date.now()}`;
            const backupPath = path.join(__dirname, `${backupId}.mp3`);

            await youtubedl(video.url, {
                format: 'bestaudio',
                output: backupPath,
                noCheckCertificates: true
            });

            const backupFiles = fs.readdirSync(__dirname);
            const foundBackup = backupFiles.find(file => file.startsWith(backupId));

            if (foundBackup) {
                const finalBackupPath = path.join(__dirname, foundBackup);
                await sock.sendMessage(chatId, {
                    audio: fs.readFileSync(finalBackupPath),
                    mimetype: 'audio/mpeg',
                    fileName: `${video.title}.mp3`
                }, { quoted: message });

                if (fs.existsSync(finalBackupPath)) fs.unlinkSync(finalBackupPath);
                return;
            }
        } catch (secondaryErr) {
            console.error('Secondary Fallback Also Failed:', secondaryErr.message);
        }

        await sock.sendMessage(chatId, { text: `❌ *Error:* Failed to process audio stream. Please check terminal logs.` }, { quoted: message });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
        if (actualFilePath && fs.existsSync(actualFilePath)) {
            try { fs.unlinkSync(actualFilePath); } catch (e) {}
        }
    }
}

module.exports = songCommand;
