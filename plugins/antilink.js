const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

// Bot Owner Number
const BOT_OWNER = '918136880986@s.whatsapp.net'; 

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
            const usage = `\`\`\`ANTILINK SETUP\n\n${prefix}antilink on\n${prefix}antilink set delete | kick | warn\n${prefix}antilink off\n\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled || existingConfig) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already on_*' }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_Antilink has been turned ON (Default action: delete)_*' : '*_Failed to turn on Antilink_*' 
                },{ quoted: message });
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
                const status = config ? 'ON' : 'OFF';
                const actionType = config?.action || (config ? 'delete' : 'Not set');
                await sock.sendMessage(chatId, { 
                    text: `*_Antilink Configuration:_*\nStatus: ${status}\nAction: ${actionType}` 
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

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        // 1. Bypass if the sender is the bot owner
        if (senderId.includes(BOT_OWNER.split('@')[0])) {
            console.log('Bot owner sent a link. Skipping antilink.');
            return;
        }

        const antilinkConfig = await getAntilink(chatId, 'on');
        if (!antilinkConfig) return; // Return if Antilink is off

        // 2. Bypass if the sender is the group creator
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(chatId);
        } catch (e) {
            console.error('Failed to fetch group metadata:', e);
            return;
        }

        const groupOwner = groupMetadata.owner;
        if (senderId === groupOwner) {
            console.log('Sender is the group creator. Skipping.');
            return;
        }

        const actionType = antilinkConfig.action || 'delete';

        console.log(`Antilink Setting for ${chatId}: ON (Action: ${actionType})`);
        console.log(`Checking message for links: ${userMessage}`);

        const linkPattern = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;

        if (linkPattern.test(userMessage)) {
            console.log('Detected a link!');

            const quotedMessageId = message.key.id;
            const quotedParticipant = message.key.participant || senderId;

            // Step 1: Delete the message first
            try {
                await sock.sendMessage(chatId, {
                    delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
                });
                console.log('Message deleted successfully.');
            } catch (error)  {
                console.error('Failed to delete message:', error);
            }

            // Perform action based on configuration
            if (actionType === 'kick') {
                try {
                    // Step 2: Send MP3 Audio file with ONLY the mention (No caption text)
                    const audioUrl = 'https://www.image2url.com/r2/default/audio/1785772061136-c435c7b0-d733-40bd-a2dd-25fd815eb969.m4a';

                    await sock.sendMessage(chatId, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mp4',
                        ptt: false, // Normal MP3 audio file
                        mentions: [senderId] // Only mentions the user without any text caption
                    });

                    console.log('Audio sent successfully with mention. Waiting before kicking...');
                    
                    // Delay to ensure the audio is completely sent before removing the user
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Step 3: Remove user from the group after the audio is sent
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    console.log('User kicked successfully.');
                } catch (err) {
                    console.error('Failed to kick user or send audio:', err);
                    await sock.sendMessage(chatId, { text: '_Failed to kick user. Make sure bot is admin._' });
                }
            } else if (actionType === 'warn') {
                await sock.sendMessage(chatId, { 
                    text: `_Warning! @${senderId.split('@')[0]}, posting links is not allowed here!_`, 
                    mentions: [senderId] 
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: `_@${senderId.split('@')[0]}, links are not allowed in this group!_`, 
                    mentions: [senderId] 
                });
            }
        }
    } catch (error) {
        console.error('Error in link detection:', error);
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
