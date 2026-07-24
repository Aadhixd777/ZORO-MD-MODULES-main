const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
  try {
    const res = await axios.get('https://api.github.com/repos/Aadhixd777/ZORO-MD', {
      headers: {
        'User-Agent': 'ZORO-MD-Bot',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });

    const json = res.data;

    // Date formatting using native Date object
    const updatedAt = json.updated_at ? new Date(json.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';

    let txt = `*乂  𝗭𝗢𝗥𝗢 𝗠𝗗  乂*\n\n`;
    txt += `✩  *𝗡𝗮𝗺𝗲* : ${json.name || 'ZORO-MD'}\n`;
    txt += `✩  *𝗢𝘄𝗻𝗲𝗿* : ${json.owner?.login || 'Aadhixd'}\n`;
    txt += `✩  *𝗪𝗮𝘁𝗰𝗵𝗲𝗿𝘀* : ${json.watchers_count || 0}\n`;
    txt += `✩  *𝗦𝗶𝘇𝗲* : ${((json.size || 0) / 1024).toFixed(2)} MB\n`;
    txt += `✩  *𝗟𝗮𝘀𝘁 𝗨𝗽𝗱𝗮𝘁𝗲𝗱* : ${updatedAt}\n`;
    txt += `✩  *𝗨𝗥𝗟* : ${json.html_url || 'https://github.com/Aadhixd777/ZORO-MD.git'}\n`;
    txt += `✩  *𝗙𝗼𝗿𝗸𝘀* : ${json.forks_count || 0}\n`;
    txt += `✩  *𝗦𝘁𝗮𝗿𝘀* : ${json.stargazers_count || 0}\n`;
    txt += `✩  *𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲* : ${json.language || 'JavaScript'}\n\n`;
    txt += `💥 *𝗭𝗢𝗥𝗢 𝗠𝗗*`;

    const imgPath = path.join(__dirname, '../media/zoro_md.jpg');
    
    if (fs.existsSync(imgPath)) {
      const imgBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
    } else {
      await sock.sendMessage(chatId, { text: txt }, { quoted: message });
    }
  } catch (error) {
    console.error('GitHub command error:', error.message);
    await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
  }
}

module.exports = githubCommand;
