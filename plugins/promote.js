const isAdmin = require('../lib/isAdmin');

const OWNER_NUMBER = "918136880986"; // നിങ്ങളുടെ ഓണർ നമ്പർ

// Function to handle manual promotions via command
async function promoteCommand(sock, chatId, mentionedJids, message) {
    try {
        // First check if it's a group
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: 'This command can only be used in groups!'
            });
            return;
        }

        // Get sender ID correctly for group messages
        const senderId = message.key.participant || message.participant || message.key.remoteJid;
        const cleanSenderNum = senderId.split('@')[0].split(':')[0];

        // 🎯 1. ബോട്ട് ഓണറായ നിങ്ങളാണോ എന്ന് നോക്കുന്നു
        const isOwner = message.key.fromMe || cleanSenderNum === OWNER_NUMBER;

        // Check admin status first, before any other operations
        try {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            
            if (!adminStatus.isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Error: Please make the bot an admin first to use this command.'
                });
                return;
            }

            // 🎯 2. നിങ്ങൾ ഓണർ അല്ലെങ്കിൽ, സാധാരണ യൂസർ അഡ്മിൻ ആണോ എന്ന് പരിശോധിക്കും
            if (!isOwner && !adminStatus.isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Error: Only group admins can use the promote command.'
                });
                return;
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError);
            await sock.sendMessage(chatId, { 
                text: '❌ Error: Please make sure the bot is an admin of this group.'
            });
            return;
        }

        let userToPromote = [];
        
        // Check for mentioned users
        if (mentionedJids && mentionedJids.length > 0) {
            userToPromote = mentionedJids;
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        // 🎯 3. ഓണറായ നിങ്ങൾ ആരെയും മെൻഷൻ ചെയ്യാതെയോ അല്ലെങ്കിൽ സ്വന്തം മെസ്സേജ് റിപ്ലൈ ചെയ്തോ .promote അടിച്ചാൽ നിങ്ങളെത്തന്നെ അഡ്മിൻ ആക്കും
        if (userToPromote.length === 0) {
            if (isOwner) {
                userToPromote = [senderId];
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Error: Please mention the user or reply to their message to promote!'
                });
                return;
            }
        }

        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");
        
        // Get usernames for each promoted user
        const usernames = await Promise.all(userToPromote.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        // Get promoter's name (the bot user in this case)
        const promoterJid = sock.user.id;
        
        const promotionMessage = `*『 𝐆𝐑𝐎𝐔𝐏 𝐏𝐑𝐎𝐌𝐎𝐓𝐈𝐎𝐍 』*\n\n` +
            `👥 *𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝 𝐔𝐬𝐞𝐫${userToPromote.length > 1 ? 's' : ''}:*\n` +
            `${usernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝 𝐁𝐲:* @${promoterJid.split('@')[0]}\n\n` +
            `📅 *𝐃𝐚𝐭𝐞:* ${new Date().toLocaleString()}`;
        await sock.sendMessage(chatId, { 
            text: promotionMessage,
            mentions: [...userToPromote, promoterJid]
        });
    } catch (error) {
        console.error('Error in promote command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to promote user(s)!'});
    }
}

// Function to handle automatic promotion detection
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        // Safety check for participants
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        // Get usernames for promoted participants
        const promotedUsernames = await Promise.all(participants.map(async jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]} `;
        }));

        let promotedBy;
        let mentionList = permissions = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            promotedBy = 'System';
        }

        const promotionMessage = `*『 𝐆𝐑𝐎𝐔𝐏 𝐏𝐑𝐎𝐌𝐎𝐓𝐈𝐎𝐍 』*\n\n` +
            `👥 *𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝 𝐔𝐬𝐞𝐫${participants.length > 1 ? 's' : ''}:*\n` +
            `${promotedUsernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝 𝐁𝐲:* ${promotedBy}\n\n` +
            `📅 *𝐃𝐚𝐭𝐞:* ${new Date().toLocaleString()}`;
        
        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('Error handling promotion event:', error);
    }
}

module.exports = { promoteCommand, handlePromotionEvent };
