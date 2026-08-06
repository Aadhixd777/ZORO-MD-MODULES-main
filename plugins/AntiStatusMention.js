// Anti-Status Mention Plugin with Warning Message & Owner Exemption

const antiStatusMentionStatus = new Map();

// Replace with your actual bot owner phone number (without '+' or spaces, e.g., '918136880986')
const BOT_OWNER_NUMBER = "918136880986"; 

async function handleAntiStatusMention(sock, chatId, message, senderId) {
    try {
        if (!antiStatusMentionStatus.get(chatId)) return;

        const cleanSenderId = senderId ? senderId.split('@')[0] : '';
        const isOwner = cleanSenderId === BOT_OWNER_NUMBER;

        // Only Bot Owner is exempted
        if (isOwner) return;

        const msgContent = message.message;
        if (!msgContent) return;

        const isStatusShare = 
            msgContent.extendedTextMessage && 
            msgContent.extendedTextMessage.contextInfo && 
            (msgContent.extendedTextMessage.contextInfo.quotedMessage || 
             msgContent.extendedTextMessage.contextInfo.isForwarded ||
             msgContent.extendedTextMessage.text?.includes('status'));

        const contextInfo = msgContent.extendedTextMessage?.contextInfo || msgContent.imageMessage?.contextInfo || msgContent.videoMessage?.contextInfo;
        const isFromStatus = contextInfo && (contextInfo.remoteJid === 'status@broadcast' || contextInfo.stanzaId);

        if (isStatusShare || isFromStatus) {
            console.log('Status mention detected! Deleting and warning...');

            const messageId = message.key.id;
            const participant = message.key.participant || senderId;

            try {
                // Delete the status mention message
                await sock.sendMessage(chatId, {
                    delete: { remoteJid: chatId, fromMe: false, id: messageId, participant: participant },
                });

                // Send Clean English Warning Message
                await sock.sendMessage(chatId, { 
                    text: `⚠️ Notice: @${participant.split('@')[0]}, sharing or mentioning status updates is not allowed in this group. Your message has been removed.`,
                    mentions: [participant]
                });

                console.log('Status mention deleted and warning sent successfully.');
            } catch (error) {
                console.error('Failed to delete status mention or send warning:', error);
            }
        }
    } catch (error) {
        console.error('Anti-status mention error:', error);
    }
}

// Command Handler to Toggle Feature
async function toggleAntiStatusMention(sock, chatId, userMessage, senderId, isGroupAdmin) {
    const cleanSenderId = senderId ? senderId.split('@')[0] : '';
    const isOwner = cleanSenderId === BOT_OWNER_NUMBER;

    if (!isGroupAdmin && !isOwner) {
        await sock.sendMessage(chatId, { text: '⚠️ Access Denied: This command can only be used by group administrators or the bot owner.' });
        return;
    }

    const args = userMessage.trim().split(/\s+/);
    if (args.length < 2) {
        await sock.sendMessage(chatId, { text: 'ℹ️ Usage instruction:\n• .antistatus on\n• .antistatus off' });
        return;
    }

    const option = args.length > 1 ? args[1].toLowerCase() : '';
    if (option === 'on') {
        antiStatusMentionStatus.set(chatId, true);
        await sock.sendMessage(chatId, { text: '✅ Success: Anti-Status Mention protection has been enabled for this chat.' });
    } else if (option === 'off') {
        antiStatusMentionStatus.set(chatId, false);
        await sock.sendMessage(chatId, { text: '❌ Success: Anti-Status Mention protection has been disabled for this chat.' });
    } else {
        await sock.sendMessage(chatId, { text: '⚠️ Invalid option! Please use `.antistatus on` or `.antistatus off`.' });
    }
}

module.exports = {
    handleAntiStatusMention,
    toggleAntiStatusMention
};
