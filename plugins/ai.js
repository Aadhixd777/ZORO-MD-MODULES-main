const axios = require('axios');
const fetch = require('node-fetch');

async function aiCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a question after .gpt or .gemini\n\nExample: .gpt Give me an advice" 
            }, { quoted: message });
        }

        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a question after .gpt or .gemini" 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🤖', key: message.key }
        });

        if (command === '.gpt') {
            const gptApis = [
                `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                `https://api.siputzx.my.id/api/ai/chatgpt?text=${encodeURIComponent(query)}`,
                `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(query)}`
            ];

            let success = false;
            for (const api of gptApis) {
                try {
                    const response = await fetch(api);
                    const data = await response.json();
                    const answer = data.result || data.data || data.message;

                    if (answer) {
                        await sock.sendMessage(chatId, {
                            text: answer,
                            contextInfo: { 
                                forwardingScore: 1, 
                                isForwarded: true, 
                                forwardedNewsletterMessageInfo: { 
                                    newsletterJid: '120363197401188542@newsletter', 
                                    newsletterName: 'ᴄʜᴀᴛɢᴩᴛ ᴀɪ' 
                                } 
                            }
                        }, { quoted: message });
                        success = true;
                        break;
                    }
                } catch (e) {
                    continue; 
                }
            }
            if (!success) throw new Error('All GPT APIs failed');

        } else if (command === '.gemini') {
            const geminiApis = [
                `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
                `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`,
                `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(query)}`,
                `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(query)}`,
                `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(query)}`
            ];

            let success = false;
            for (const api of geminiApis) {
                try {
                    const response = await fetch(api);
                    const data = await response.json();
                    const answer = data.message || data.data || data.answer || data.result;

                    if (answer) {
                        await sock.sendMessage(chatId, {
                            text: answer,
                            contextInfo: { 
                                forwardingScore: 1, 
                                isForwarded: true, 
                                forwardedNewsletterMessageInfo: { 
                                    newsletterJid: '120363197401188542@newsletter', 
                                    newsletterName: 'ɢᴇᴍɪɴɪ ᴀɪ' 
                                } 
                            }
                        }, { quoted: message });
                        success = true;
                        break;
                    }
                } catch (e) {
                    continue; 
                }
            }
            if (!success) throw new Error('All Gemini APIs failed');
        }

    } catch (error) {
        console.error('AI Command Error:', error);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to get response from all available APIs. Please try again later.",
            contextInfo: {
                mentionedJid: [message.key.participant || message.key.remoteJid],
                quotedMessage: message.message
            }
        }, { quoted: message });
    }
}

module.exports = aiCommand;
