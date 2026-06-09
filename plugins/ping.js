const os = require('os');
const fs = require('fs');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

function getSpeedEmoji(ping) {
    if (ping < 100) return '🚀';
    if (ping < 300) return '⚡';
    return '🛰️';
}

function getSpeedStatus(ping) {
    if (ping < 100) return '𝗛𝗬𝗣𝗘𝗥 𝗦𝗣𝗘𝗘𝗗';
    if (ping < 300) return '𝗢𝗣𝗧𝗜𝗠𝗔𝗟';
    return '𝗗𝗘𝗟𝗔𝗬𝗘𝗗';
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        // Simple but powerful entry
        const tempMsg = await sock.sendMessage(chatId, { text: '⚡ *[ ZORO MD ]* _Analyzing server latency..._' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);

        // Delete the initial checking message
        await sock.sendMessage(chatId, { delete: tempMsg.key });

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);
        const speedEmoji = getSpeedEmoji(ping);
        const speedStatus = getSpeedStatus(ping);
        
        const cpuUsage = os.loadavg()[0].toFixed(2);
        const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);
        const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

        // Truly original premium design
        const botInfo = `
✨ *❖━━━━━━[ 𝗭𝗢𝗥𝗢 𝗠𝗗 𝗣𝗜𝗡𝗚 ]━━━━━━❖* ✨

*“ Speed defines power, performance defines class. ”*

*┌────────────────────────┐*
*│ 📊 PERFORMANCE STATS*
*│*
*│* 🚀 *𝗣𝗶𝗻𝗴:* \`${ping} 𝗺𝘀\`
*│* ⚡ *𝗥𝗮𝗻𝗸:* \`${speedStatus}\`
*│* ⏳ *𝗨𝗽𝘁𝗶𝗺𝗲:* \`${uptimeFormatted}\`
*└────────────────────────┘*

*┌────────────────────────┐*
*│ 🧠 SYSTEM ARCHITECTURE*
*│*
*│* 🖥️ *𝗖𝗣𝗨 𝗟𝗼𝗮𝗱:* \`${cpuUsage}%\`
*│* 💾 *𝗥𝗔𝗠 𝗨𝘀𝗲𝗱:* \`${usedMem} 𝗚𝗕\`
*│* 📊 *𝗠𝗲𝗺𝗼𝗿𝘆:* \`${memPercent}%\`
*│* 📦 *𝗩𝗲𝗿𝘀𝗶𝗼𝗻:* \`v${settings.version}\`
*└────────────────────────┘*

*🔥 Engine status: Running flawlessly.*
*━━━━━━━━━━━━━━━━━━━━━━━━━━━*
> *© 𝗢𝘄𝗻𝗲𝗿 & 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗱 𝗯𝘆 👑 𝗔𝗮𝗱𝗵𝗶𝘅𝗱 ⚡*`;

        const imageUrl = "https://i.postimg.cc/wjdj0ZG1/zoro.jpg"; 
        const bgmPath = './media/zoro_bgm.mp3'; 

        // 1. Send the image with the premium caption
        await sock.sendMessage(chatId, { 
            image: { url: imageUrl }, 
            caption: botInfo.trim() 
        }, { quoted: message });

        // 2. Play the background BGM as a normal Audio File
        if (fs.existsSync(bgmPath)) {
            const audioBuffer = fs.readFileSync(bgmPath);
            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mp4', // Standard audio player format
                ptt: false // Set to false to show as a clickable audio file, not a voice note
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get bot status.' });
    }
}

module.exports = pingCommand;
