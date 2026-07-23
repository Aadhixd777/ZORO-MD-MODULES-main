const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const os = require('os');

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function runtime(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d > 0 ? d + "d " : "";
    var hDisplay = h > 0 ? h + "h " : "";
    var mDisplay = m > 0 ? m + "m " : "";
    var sDisplay = s > 0 ? s + "s" : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

function countCommands() {
    try {
        const pluginsDir = path.join(__dirname);
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
        return files.length;
    } catch (error) {
        return 0;
    }
}

async function menuCommand(sock, chatId, message) {
    try {
        const userName = message.pushName || 'User';
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const uptime = runtime(process.uptime());
        const totalPlugins = countCommands();

        let msg = `╭━━━〔 ${settings.botName || 'ZORO MD'} 〕━━━┈⊷
┃✵╭──────────────
┃✵│ Owner : ${settings.ownerName || 'Aadhi Xd'}
┃✵│ User : ${userName.replace(/[\r\n]+/gm, "")}
┃✵│ Plugins : ${totalPlugins}
┃✵│ Runtime : ${uptime}
┃✵│ Mode : ${settings.mode || 'Public'}
┃✵│ Platform : ${os.platform()}
┃✵│ Ram : ${formatBytes(usedMem)} / ${formatBytes(totalMem)}
┃✵│ Version : ${settings.version || '3.0.0'}
┃✵╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
`;

        // Local menu thumbnail if available
        let thumbBuffer = null;
        const thumbPath = path.join(__dirname, '../media/thumb.jpg');
        if (fs.existsSync(thumbPath)) {
            thumbBuffer = fs.readFileSync(thumbPath);
        }

        const contextInfo = {
            externalAdReply: {
                title: settings.botName || "ZORO MD OFFICIAL",
                body: `By ${settings.ownerName || 'Aadhi Xd'}`,
                showAdAttribution: true,
                renderLargerThumbnail: false,
                thumbnail: thumbBuffer,
                mediaType: 1,
                sourceUrl: "https://www.instagram.com/aadhi.x._______________"
            }
        };

        await sock.sendMessage(chatId, { 
            text: msg, 
            contextInfo: contextInfo 
        }, { quoted: message });

    } catch (error) {
        console.error('Error in menuCommand:', error);
    }
}

module.exports = { menuCommand, runtime };
