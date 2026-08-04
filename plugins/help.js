const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { fontStyles, loadFontSettings } = require('../lib/fontTransformer');

function countCommands() {
    try {
        const pluginsDir = path.join(__dirname);
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
        return files.length;
    } catch (error) {
        return 100;
    }
}

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

function getEastAfricaDate() {
    const now = new Date();
    const eatOffset = 5.5 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    const day = eatTime.getDate().toString().padStart(2, '0');
    const month = (eatTime.getMonth() + 1).toString().padStart(2, '0');
    const year = eatTime.getFullYear();
    
    return `${day}/${month}/${year}`;
}

function getBotMode() {
    try {
        const data = JSON.parse(fs.readFileSync('./data/messageCount.json', 'utf8'));
        return data.isPublic ? '𝗣𝘂𝗯𝗹𝗶𝗰' : '𝗣𝗿𝗶𝘃𝗮𝘁𝗲';
    } catch (error) {
        return '𝗣𝘂𝗯𝗹𝗶𝗰';
    }
}

async function helpCommand(sock, chatId, message) {
        const start = Date.now();
        await sock.sendMessage(chatId, { text: 'LOADING...' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);
        
        const currentTime = getEastAfricaTime();
        const currentDate = getEastAfricaDate();
        const botMode = getBotMode();
        const commandCount = countCommands();
        
        let fontSettings = { currentFont: 'default', enabled: true };
        try {
            fontSettings = loadFontSettings();
        } catch (error) {
            console.error('Error loading font settings, using defaults:', error);
        }
        
        const transformText = (text) => {
            try {
                if (fontSettings.currentFont && fontSettings.currentFont !== 'default') {
                    const style = fontStyles[fontSettings.currentFont];
                    if (style && style.transform) {
                        return style.transform(text);
                    }
                }
            } catch (error) {
                console.error('Error transforming text:', error);
            }
            return text;
        };
        
    const helpMessage = `
‎╔▣ ${transformText('ZORO MD')} ▣
‎┃
‎┃👑╔◉${transformText('Owner')} : ${transformText('Aadhi Xd')}
‎┃💎╏ ${transformText('Version')} : ${settings.version || '3.0.0'}
‎┃🗂️╏ ${transformText('Commands')} : [ ${commandCount}+ ]
‎┃🔖╏ ${transformText('Prefix')}: [ . ]
‎┃🔐╏ ${transformText('Mode')} : ${botMode}
‎┃⏰╏ ${transformText('Time')}: ${currentTime}
‎┃📅╏ ${transformText('Date')}: ${currentDate}
‎┃╏ ${transformText('Uptime')}: ${uptimeFormatted}
‎┃🚀╚◉${transformText('Speed')}: ${ping} ms 
‎┃
‎╰◇ *${transformText('COMMAND CATEGORIES')}* ◇✤

‎╭▣ 🌐 ${transformText('GENERAL COMMANDS')} ▣
‎│➽ .${transformText('menu')} or .${transformText('help')}
‎│➽ .${transformText('ping')}
‎│➽ .${transformText('alive')}
‎│➽ .${transformText('tts')}
‎│➽ .${transformText('owner')}
│➽ .${transformText('realowner')}
‎│➽ .${transformText('joke')}
‎│➽ .${transformText('quote')}
‎│➽ .${transformText('fact')}
‎│➽ .${transformText('weather')}
‎│➽ .${transformText('new')}
‎│➽ .${transformText('attp')}
‎│➽ .${transformText('lyrics')}
‎│➽ .${transformText('brat')}
‎│➽ .${transformText('bratvid')}
‎│➽ .${transformText('8ball')}
‎│➽ .${transformText('groupinfo')}
‎│➽ .${transformText('staff')} or ${transformText('admins')}
‎│➽ .${transformText('vv')}
‎│➽ .${transformText('trt')}
‎│➽ .${transformText('ss')}
‎│➽ .${transformText('jid')}
‎│➽ .${transformText('url')}
‎│➽ .${transformText('img')}
‎│➽ .${transformText('pinterestimg')}
‎│➽ .${transformText('bingimg')}
‎│➽ .${transformText('realowner')}
‎│➽ .${transformText('solve')}
‎│➽ .${transformText('age')}
‎│➽ .${transformText('fliptext')}
‎│➽ .${transformText('setbotfont')}
‎╰────────────────◇

‎╭▣ 👮‍♂️ ${transformText('ADMIN COMMANDS')} ▣
‎│➽ .${transformText('ban')}
‎│➽ .${transformText('promote')}
‎│➽ .${transformText('demote')}
‎│➽ .${transformText('mute')}
‎│➽ .${transformText('unmute')}
‎│➽ .${transformText('delete')}
‎│➽ .${transformText('kick')}
‎│➽ .${transformText('warn')}
‎│➽ .${transformText('warnings')}
‎│➽ .${transformText('antilink')}
‎│➽ .${transformText('antibadword')}
‎│➽ .${transformText('clear')}
‎│➽ .${transformText('tag')}
‎│➽ .${transformText('tagall')}
‎│➽ .${transformText('tagnotadmin')}
‎│➽ .${transformText('hidetag')}
‎│➽ .${transformText('chatbot')}
‎│➽ .${transformText('resetlink')}
‎│➽ .${transformText('antitag')}
‎│➽ .${transformText('welcome')}
‎│➽ .${transformText('goodbye')}
‎│➽ .${transformText('setgdesc')}
‎│➽ .${transformText('setgname')}
‎│➽ .${transformText('setgpp')}
‎│➽ .${transformText('getgroupp')}
‎│➽ .${transformText('groupid')}
‎│➽ .${transformText('close')}
‎│➽ .${transformText('open')}
‎│➽ .${transformText('approveall')}
‎│➽ .${transformText('disapproveall')}
‎│➽ .${transformText('antisticker')}
‎│➽ .${transformText('antibot')}
‎│➽ .${transformText('antiforward')}
‎│➽ .${transformText('antistatus')} ${transformText('on')} / ${transformText('off')}
‎╰────────────────◇

‎╭▣ 🔒 ${transformText('OWNER COMMANDS')} ▣
‎│➽ .${transformText('update')}
‎│➽ .${transformText('mode')}
‎│➽ .${transformText('clearsession')}
‎│➽ .${transformText('setprefix')}
‎│➽ .${transformText('antidelete')}
‎│➽ .${transformText('cleartmp')}
‎│➽ .${transformText('settings')}
‎│➽ .${transformText('setpp')}
‎│➽ .${transformText('getpp')}
‎│➽ .${transformText('creategr')}
‎│➽ .${transformText('autoreact')}
‎│➽ .${transformText('autostatus')}
‎│➽ .${transformText('autotyping')}
‎│➽ .${transformText('autoread')}
‎│➽ .${transformText('anticall')}
‎│➽ .${transformText('pmblocker')}
‎│➽ .${transformText('pmblocker')} ${transformText('setmsg')} 
‎│➽ .${transformText('mention')}
‎╰────────────────◇

‎╭▣ 🎙️ ${transformText('AUDIO COMMANDS')} ▣
‎│➽ .${transformText('bass')}
‎│➽ .${transformText('blow')}
‎│➽ .${transformText('errape')}
‎│➽ .${transformText('robot')}
‎╰────────────────◇

‎╭▣ 🔄 ${transformText('CONVERTER')} ▣
‎│➽ .${transformText('toaudio')}
‎│➽ .${transformText('volvideo')}
‎│➽ .${transformText('toviewonce')}
‎│➽ .${transformText('editcaption')}
‎╰────────────────◇

‎╭▣ 🎨 ${transformText('MEDIA TOOLS')} ▣
‎│➽ .${transformText('blur')}
‎│➽ .${transformText('simage')}
‎│➽ .${transformText('pic')}
‎│➽ .${transformText('sticker')}
‎│➽ .${transformText('removebg')}
‎│➽ .${transformText('remini')}
‎│➽ .${transformText('crop')}
‎│➽ .${transformText('tgsticker')}
‎│➽ .${transformText('meme')}
‎│➽ .${transformText('take')}
‎│➽ .${transformText('emojimix')}
‎│➽ .${transformText('igs')}
‎│➽ .${transformText('igsc')}
‎╰────────────────◇

‎╭▣ 🖼️ ${transformText('PIES COMMANDS')} ▣
‎│➽ .${transformText('pies')}
‎│➽ .${transformText('china')}
‎│➽ .${transformText('indonesia')}
‎│➽ .${transformText('japan')}
‎│➽ .${transformText('korea')}
‎│➽ .${transformText('hijab')}
‎╰────────────────◇

‎╭▣ 🎮 ${transformText('GAME COMMANDS')} ▣
‎│➽ .${transformText('tictactoe')}
‎│➽ .${transformText('hangman')}
‎│➽ .${transformText('guess')}
‎│➽ .${transformText('trivia')}
‎│➽ .${transformText('answer')}
‎│➽ .${transformText('truth')}
‎│➽ .${transformText('dare')}
‎╰────────────────◇

‎╭▣ 🤖 ${transformText('AI COMMANDS')} ▣
‎│➽ .${transformText('ai')}
‎│➽ .${transformText('gemini')}
‎│➽ .${transformText('gpt')}
‎│➽ .${transformText('imagine')}
‎│➽ .${transformText('flux')}
‎│➽ .${transformText('sora')}
‎╰────────────────◇

‎╭▣ 🎯 ${transformText('FUN COMMANDS')} ▣
‎│➽ .${transformText('compliment')}
‎│➽ .${transformText('insult')}
‎│➽ .${transformText('flirt')}
‎│➽ .${transformText('shayari')}
‎│➽ .${transformText('goodnight')}
‎│➽ .${transformText('roseday')}
‎│➽ .${transformText('character')}
‎│➽ .${transformText('wasted')}
‎│➽ .${transformText('ship')}
‎│➽ .${transformText('simp')}
‎│➽ .${transformText('stupid')}
‎╰────────────────◇

‎╭▣ 🔤 ${transformText('TEXTMAKER')} ▣
‎│➽ .${transformText('metallic')}
‎│➽ .${transformText('ice')}
‎│➽ .${transformText('snow')}
‎│➽ .${transformText('impressive')}
‎│➽ .${transformText('matrix')}
‎│➽ .${transformText('light')}
‎│➽ .${transformText('neon')}
‎│➽ .${transformText('devil')}
‎│➽ .${transformText('purple')}
‎│➽ .${transformText('thunder')}
‎│➽ .${transformText('leaves')}
‎│➽ .1917
‎│➽ .${transformText('arena')}
‎│➽ .${transformText('hacker')}
‎│➽ .${transformText('sand')}
‎│➽ .${transformText('blackpink')}
‎│➽ .${transformText('glitch')}
‎│➽ .${transformText('fire')}
‎╰────────────────◇

‎╭▣ 📥 ${transformText('DOWNLOADER')} ▣
‎│➽ .${transformText('play')}
‎│➽ .${transformText('song')}
‎│➽ .${transformText('spotify')}
‎│➽ .${transformText('instagram')}
‎│➽ .${transformText('facebook')}
‎│➽ .${transformText('tiktok')}
‎│➽ .${transformText('video')}
‎│➽ .${transformText('ytmp4')}
‎╰────────────────◇

‎╭▣ 🧩 ${transformText('MISC COMMANDS')} ▣
‎│➽ .${transformText('heart')}
‎│➽ .${transformText('horny')}
‎│➽ .${transformText('circle')}
‎│➽ .${transformText('lgbt')}
‎│➽ .${transformText('lolice')}
‎│➽ .${transformText('its-so-stupid')}
‎│➽ .${transformText('namecard')}
‎│➽ .${transformText('oogway')}
‎│➽ .${transformText('tweet')}
‎│➽ .${transformText('ytcomment')}
‎│➽ .${transformText('comrade')}
‎│➽ .${transformText('gay')}
‎│➽ .${transformText('glass')}
‎│➽ .${transformText('jail')}
‎│➽ .${transformText('passed')}
‎│➽ .${transformText('triggered')}
‎╰────────────────◇

‎╭▣ 🖼️ ${transformText('ANIME COMMANDS')} ▣
‎│➽ .${transformText('animu')}
‎│➽ .${transformText('neko')}
‎│➽ .${transformText('waifu')}
‎│➽ .${transformText('loli')}
‎│➽ .${transformText('nom')}
‎│➽ .${transformText('poke')}
‎│➽ .${transformText('cry')}
‎│➽ .${transformText('kiss')}
‎│➽ .${transformText('pat')}
‎│➽ .${transformText('hug')}
‎│➽ .${transformText('wink')}
‎│➽ .${transformText('facepalm')}
‎╰────────────────◇

‎╭▣ 🔧 ${transformText('OTHER COMMANDS')} ▣
‎│➽ .${transformText('git')}
‎│➽ .${transformText('github')}
‎│➽ .${transformText('sc')}
‎│➽ .${transformText('script')}
‎│➽ .${transformText('repo')}
‎╰────────────────◇

‎© *${transformText('POWERED BY XD BROTHERS AADHIXD')}*`;

    let thumbBuffer = null;
    const thumbPath = path.join(__dirname, '../media/thumb.jpg');
    
    if (fs.existsSync(thumbPath)) {
        thumbBuffer = fs.readFileSync(thumbPath);
    } else {
        console.error('Thumbnail image not found at:', thumbPath);
    }

    const contextInfo = {
        externalAdReply: {
            title: "ZORO MD OFFICIAL BOT",
            body: "𝗭𝗢𝗥𝗢 𝗕𝗬 𝗔𝗮𝗱𝗵𝗶𝘅𝗱",
            showAdAttribution: true,
            renderLargerThumbnail: false,
            thumbnail: thumbBuffer,
            mediaType: 1,
            sourceUrl: "https://www.instagram.com/aadhi.x._______________"
        }
    };

    try {
        const videoPath = path.join(__dirname, '../media/menu.mp4');
        const audioPath = path.join(__dirname, '../media/menu.mp3');
        
        if (fs.existsSync(videoPath)) {
            const videoBuffer = fs.readFileSync(videoPath);
            
            await sock.sendMessage(chatId, {
                video: videoBuffer,
                caption: helpMessage,
                mimetype: 'video/mp4',
                gifPlayback: false,
                contextInfo: contextInfo
            }, { quoted: message });
        } else {
            console.error('Menu video not found at:', videoPath);
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: contextInfo
            }, { quoted: message });
        }
        
        if (fs.existsSync(audioPath)) {
            const audioBuffer = fs.readFileSync(audioPath);
            
            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { 
            text: helpMessage,
            contextInfo: contextInfo 
        }, { quoted: message });
    }
}

module.exports = helpCommand;
