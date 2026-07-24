const { getAntilink, setAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n${prefix}antilink get\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already ON_*' }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_Antilink has been turned ON (Default: delete)_*' : '*_Failed to turn on Antilink_*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_Please specify an action: ${prefix}antilink set delete | kick | warn_*` 
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_Invalid action. Choose delete, kick, or warn._*' 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_Antilink action set to ${setAction}_*` : '*_Failed to set Antilink action_*' 
                }, { quoted: message });
                break;

            case 'get':
                const config = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_Antilink Configuration:_*\nStatus: ${config?.enabled ? 'ON' : 'OFF'}\nAction: ${config?.action || 'delete'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antilink for usage._*` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' }, { quoted: message });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId, isSenderAdmin) {
    try {
        // 1. അഡ്മിൻമാർ ലിങ്ക് അയച്ചാൽ ഡിലീറ്റ് ചെയ്യേണ്ടതില്ല (Bypass Admins)
        if (isSenderAdmin) return;

        // 2. ആന്റിലിങ്ക് കോൺഫിഗറേഷൻ എടുക്കുന്നു
        const config = await getAntilink(chatId, 'on');
        if (!config || !config.enabled) return;

        const action = config.action || 'delete';

        // 3. ലിങ്കുകൾ കണ്ടെത്താനുള്ള റീജക്സ് (Regex Pattern)
        const linkPattern = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?|chat\.whatsapp\.com\/[A-Za-z0-9]{20,}|t\.me\/[A-Za-z0-9_]+/i;

        if (linkPattern.test(userMessage)) {
            console.log(`[ANTILINK] Link detected from ${senderId} in ${chatId}`);

            const messageId = message.key.id;
            const participant = message.key.participant || senderId;

            // ✅ മെസ്സേജ് ഡിലീറ്റ് ചെയ്യൽ
            try {
                await sock.sendMessage(chatId, {
                    delete: { remoteJid: chatId, fromMe: false, id: messageId, participant: participant }
                });
            } catch (err) {
                console.error('[ANTILINK] Failed to delete message:', err.message);
            }

            // ✅ സെറ്റ് ചെയ്ത ആക്ഷൻ അനുസരിച്ച് പ്രവർത്തിക്കുന്നു (Delete, Kick, Warn)
            if (action === 'kick') {
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await sock.sendMessage(chatId, { 
                        text: `❌ @${senderId.split('@')[0]} was kicked for sending links!`,
                        mentions: [senderId]
                    });
                } catch (e) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ Links are not allowed here! (@${senderId.split('@')[0]})`,
                        mentions: [senderId]
                    });
                }
            } else {
                // Delete or Warn Message
                await sock.sendMessage(chatId, { 
                    text: `⚠️ Warning! @${senderId.split('@')[0]}, sending links is strictly prohibited in this group!`,
                    mentions: [senderId]
                });
            }
        }
    } catch (error) {
        console.error('Error in handleLinkDetection:', error.message);
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
