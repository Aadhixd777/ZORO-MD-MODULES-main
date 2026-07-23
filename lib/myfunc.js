const { jidDecode } = require('@whiskeysockets/baileys');
const axios = require('axios');

const smsg = (conn, m, store) => {
    if (!m) return m;
    let M = {};
    try {
        if (m.key) {
            M.key = m.key;
            M.chat = m.key.remoteJid;
            M.fromMe = m.key.fromMe;
            M.id = m.key.id;
            M.isGroup = M.chat?.endsWith('@g.us');
            M.sender = M.fromMe ? (conn.user?.id || '') : (M.isGroup ? (m.key.participant || '') : M.chat);
        }
        if (m.message) {
            M.mtype = Object.keys(m.message)[0];
            M.msg = m.message[M.mtype];
            M.body = M.msg?.text || M.msg?.caption || m.message?.conversation || M.msg?.contentText || M.msg?.selectedDisplayText || M.msg?.title || '';
            M.text = M.body;
            try { M.mentionedJid = M.msg?.contextInfo?.mentionedJid || []; } catch { M.mentionedJid = []; }
        }
        M.reply = (text, options = {}) => conn.sendMessage(M.chat, { text, ...options }, { quoted: m });
    } catch {}
    return M;
};

const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({ method: "get", url, headers: { 'DNT': 1 }, ...options, responseType: 'arraybuffer' });
        return res.data;
    } catch { return null; }
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = { smsg, getBuffer, sleep };
