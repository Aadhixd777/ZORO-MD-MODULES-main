const settings = require("../settings");
const os = require('os');
const fs = require('fs');
const path = require('path');

// List of media URLs (Images and Videos) for random selection
const mediaUrls = [
    // Images
    "https://files.catbox.moe/o6cxcz.jpg",
    "https://files.catbox.moe/9fxrv8.jpg",
    "https://files.catbox.moe/ik3wje.jpg",
    "https://files.catbox.moe/nbz0o0.jpg",
    "https://files.catbox.moe/kfop9g.jpg",
    "https://files.catbox.moe/srzqxk.jpg",
    "https://files.catbox.moe/3i4oyx.jpg",
    // Videos
    "https://files.catbox.moe/vy5vyt.mp4",
    "https://files.catbox.moe/m8h87j.mp4"
];

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

function getEastAfricaTime() {
    const now = new Date();
    const eatOffset = 5.5 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    let hours = eatTime.getHours();
    const minutes = eatTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${hours}:${minutes} ${ampm}`;
}

function getBotMode() {
    try {
        const data = JSON.parse(fs.readFileSync('./data/messageCount.json', 'utf8'));
        return data.isPublic ? '🌐 Public' : '🔒 Private';
    } catch (error) {
        return '🌐 Public';
    }
}

async function aliveCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        const tempMsg = await sock.sendMessage(chatId, { text: '⚡ Checking...' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);
        
        await sock.sendMessage(chatId, { delete: tempMsg.key });
        
        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);
        const currentTime = getEastAfricaTime();
        const botMode = getBotMode();
        const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);

        const aliveMessage = `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ✨𝗭𝗢𝗥𝗢 𝐌𝐃 ✨
┃━━━━━━━━━━━━━━━━━━━━━
┃ 🟢 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗢𝗻𝗹𝗶𝗻𝗲 & 𝗔𝗰𝘁𝗶𝘃𝗲
┃━━━━━━━━━━━━━━━━━━━━━
┃ 👑 𝗢𝘄𝗻𝗲𝗿: 𝗔𝗮𝗱𝗵𝗶𝘅𝗱
┃ 📦 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ${settings.version}
┃ 🔐 𝗠𝗼𝗱𝗲: ${botMode}
┃ ⏰ 𝗧𝗶𝗺𝗲: ${currentTime}
┃━━━━━━━━━━━━━━━━━━━━━
┃ ⚡ 𝗦𝗽𝗲𝗲𝗱: ${ping}ms
┃ 🕐 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeFormatted}
┃ 💾 𝗥𝗔𝗠: ${usedMem}GB / ${totalMem}GB
┃━━━━━━━━━━━━━━━━━━━━━
┃ 🌟 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀:
┃ ├ 📥 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿
┃ ├ 🎮 𝗚𝗮𝗺𝗲𝘀
┃ ├ 🤖 𝗔𝗜 𝗧𝗼𝗼𝗹𝘀
┃ ├ 👥 𝗚𝗿𝗼𝘂𝗽 𝗠𝗮𝗻𝗮𝗴𝗲
┃ └ 🎨 𝗠𝗲𝗱𝗶𝗮 𝗧𝗼𝗼𝗹𝘀
╰━━━━━━━━━━━━━━━━━━━━━╯
  
  📝 𝗧𝘆𝗽𝗲 *.𝗺𝗲𝗻𝘂* 𝗳𝗼𝗿 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀
  
  © 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗔𝗮𝗱𝗵𝗶𝘅𝗱`;

        const randomMediaUrl = mediaUrls[Math.floor(Math.random() * mediaUrls.length)];
        const isVideo = randomMediaUrl.endsWith('.mp4');

        await sock.sendMessage(chatId, {
            [isVideo ? 'video' : 'image']: { url: randomMediaUrl },
            caption: aliveMessage.trim(),
            ...(isVideo ? { mimetype: 'video/mp4', ptv: false } : {})
        }, { quoted: message });

    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: '🟢 Bot is alive and running!' }, { quoted: message });
    }
}

module.exports = aliveCommand;
