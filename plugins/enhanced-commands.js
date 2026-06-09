/**
 * Enhanced Commands for Nagiip Star MD
 * All-in-one comprehensive command suite
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require('fluent-ffmpeg');

// Helper function to read/write state
function getStateFile(name) {
    return path.join(__dirname, '..', 'data', `${name}.json`);
}

function readState(name, defaultValue = {}) {
    try {
        const filePath = getStateFile(name);
        if (!fs.existsSync(filePath)) return defaultValue;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return defaultValue;
    }
}

function writeState(name, data) {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(getStateFile(name), JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error writing state ${name}:`, e);
    }
}

// ==================== GROUP JOIN REQUEST COMMANDS ====================

/**
 * Approve join requests
 * Usage: .approve (reply to join request) or .approve all
 */
async function approveCommand(sock, chatId, message, args, senderId) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    try {
        // Check if sender and bot are admins
        const isAdmin = require('../lib/isAdmin');
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Please make the bot an admin first to use this command.' 
            }, { quoted: message });
        }
        
        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can approve join requests.' 
            }, { quoted: message });
        }

        const argStr = (args || '').trim().toLowerCase();
        
        if (argStr === 'all') {
            // Approve all pending join requests
            const requests = await sock.groupRequestParticipantsList(chatId);
            if (!requests || requests.length === 0) {
                return await sock.sendMessage(chatId, { text: '✅ No pending join requests found.' }, { quoted: message });
            }

            for (const req of requests) {
                try {
                    await sock.groupRequestParticipantsUpdate(chatId, [req.jid], 'approve');
                } catch (e) {}
            }

            return await sock.sendMessage(chatId, { 
                text: `✅ Approved ${requests.length} join request(s)!` 
            }, { quoted: message });
        }

        // Reply-based approval
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
        if (!quotedMsg) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Please reply to a join request or use `.approve all` to approve all requests!' 
            }, { quoted: message });
        }

        const participant = quotedMsg.participant || quotedMsg.remoteJid;
        await sock.groupRequestParticipantsUpdate(chatId, [participant], 'approve');
        
        await sock.sendMessage(chatId, { 
            text: `✅ Join request approved for @${participant.split('@')[0]}!`,
            mentions: [participant]
        }, { quoted: message });
    } catch (error) {
        console.error('Approve command error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error approving join request. Make sure the bot is admin!' }, { quoted: message });
    }
}

/**
 * Disapprove/reject join requests
 * Usage: .disapprove (reply to join request) or .disapprove all
 */
async function disapproveCommand(sock, chatId, message, args, senderId) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    try {
        // Check if sender and bot are admins
        const isAdmin = require('../lib/isAdmin');
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Please make the bot an admin first to use this command.' 
            }, { quoted: message });
        }
        
        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can reject join requests.' 
            }, { quoted: message });
        }

        const argStr = (args || '').trim().toLowerCase();
        
        if (argStr === 'all') {
            // Reject all pending join requests
            const requests = await sock.groupRequestParticipantsList(chatId);
            if (!requests || requests.length === 0) {
                return await sock.sendMessage(chatId, { text: '✅ No pending join requests found.' }, { quoted: message });
            }

            for (const req of requests) {
                try {
                    await sock.groupRequestParticipantsUpdate(chatId, [req.jid], 'reject');
                } catch (e) {}
            }

            return await sock.sendMessage(chatId, { 
                text: `✅ Rejected ${requests.length} join request(s)!` 
            }, { quoted: message });
        }

        // Reply-based rejection
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
        if (!quotedMsg) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Please reply to a join request or use `.disapprove all` to reject all requests!' 
            }, { quoted: message });
        }

        const participant = quotedMsg.participant || quotedMsg.remoteJid;
        await sock.groupRequestParticipantsUpdate(chatId, [participant], 'reject');
        
        await sock.sendMessage(chatId, { 
            text: `✅ Join request rejected for @${participant.split('@')[0]}!`,
            mentions: [participant]
        }, { quoted: message });
    } catch (error) {
        console.error('Disapprove command error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error rejecting join request. Make sure the bot is admin!' }, { quoted: message });
    }
}

// ==================== GROUP PROFILE PICTURE COMMANDS ====================

/**
 * Get group profile picture
 * Usage: .getgroupp
 */
async function getGroupPPCommand(sock, chatId, message) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    try {
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            return await sock.sendMessage(chatId, { text: '❌ This group has no profile picture!' }, { quoted: message });
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        await sock.sendMessage(chatId, {
            image: { url: ppUrl },
            caption: `📸 *${groupMetadata.subject}* Group Profile Picture`
        }, { quoted: message });
    } catch (error) {
        console.error('Get group PP error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error fetching group profile picture!' }, { quoted: message });
    }
}

/**
 * Get user profile picture
 * Usage: Reply to a message and type .getpp
 */
async function getPPCommand(sock, chatId, message) {
    try {
        // Check if sender is the owner
        if (!message.key.fromMe) {
            return await sock.sendMessage(chatId, { 
                text: '🚫 Only owner of the bot can use this command!' 
            }, { quoted: message });
        }

        // Only check for quoted message (reply)
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
        const quotedJid = quotedMsg?.participant || quotedMsg?.remoteJid;

        if (!quotedJid) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Reply to someone\'s message and type .getpp to get their profile picture!' 
            }, { quoted: message });
        }

        if (quotedJid.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Cannot get profile picture of a group!' 
            }, { quoted: message });
        }

        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(quotedJid, 'image');
        } catch {
            return await sock.sendMessage(chatId, { 
                text: '❌ This user has no profile picture!' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            image: { url: ppUrl },
            caption: `📸 Profile Picture of @${quotedJid.split('@')[0]}`,
            mentions: [quotedJid]
        }, { quoted: message });
    } catch (error) {
        console.error('Get PP error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error fetching profile picture!' 
        }, { quoted: message });
    }
}

// ==================== GROUP ID COMMAND ====================

/**
 * Get all group IDs
 * Usage: .groupid
 */
async function groupIdCommand(sock, chatId, message) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);

        if (groupList.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ No groups found!' }, { quoted: message });
        }

        let text = `*📋 ALL GROUP IDS (${groupList.length})*\n\n`;
        groupList.forEach((group, index) => {
            text += `${index + 1}. *${group.subject}*\n`;
            text += `   ID: ${group.id}\n`;
            text += `   Members: ${group.participants.length}\n\n`;
        });

        await sock.sendMessage(chatId, { text }, { quoted: message });
    } catch (error) {
        console.error('Group ID command error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error fetching group IDs!' }, { quoted: message });
    }
}

// ==================== GROUP OPEN/CLOSE COMMANDS ====================

/**
 * Close group (only admins can send messages)
 * Usage: .close
 */
async function closeGroupCommand(sock, chatId, message) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'announcement');
        await sock.sendMessage(chatId, { text: '🔒 *Group Closed!*\nOnly admins can send messages now.' }, { quoted: message });
    } catch (error) {
        console.error('Close group error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error closing group. Make sure the bot is admin!' }, { quoted: message });
    }
}

/**
 * Open group (all members can send messages)
 * Usage: .open
 */
async function openGroupCommand(sock, chatId, message) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'not_announcement');
        await sock.sendMessage(chatId, { text: '🔓 *Group Opened!*\nAll members can send messages now.' }, { quoted: message });
    } catch (error) {
        console.error('Open group error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error opening group. Make sure the bot is admin!' }, { quoted: message });
    }
}

// ==================== ANTI-STICKER COMMAND ====================

/**
 * Toggle anti-sticker mode (auto-delete stickers)
 * Usage: .antisticker on/off
 */
async function antistickerCommand(sock, chatId, message, args) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    // Check if sender is admin
    const isAdmin = require('../lib/isAdmin');
    const senderId = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
    
    if (!isSenderAdmin) {
        return await sock.sendMessage(chatId, {
            text: '❌ Only group admins can manage anti-sticker settings.'
        }, { quoted: message });
    }

    const state = readState('antisticker', {});
    const argStr = (args || '').trim().toLowerCase();

    if (!argStr || !['on', 'off', 'status'].includes(argStr)) {
        return await sock.sendMessage(chatId, {
            text: `*ANTI-STICKER*\n\n.antisticker on - Enable auto-delete stickers\n.antisticker off - Disable\n.antisticker status - Check status\n\nCurrent: ${state[chatId] ? 'ON' : 'OFF'}`
        }, { quoted: message });
    }

    if (argStr === 'status') {
        return await sock.sendMessage(chatId, { 
            text: `Anti-sticker is currently *${state[chatId] ? 'ON' : 'OFF'}* in this group.` 
        }, { quoted: message });
    }

    const enable = argStr === 'on';
    if (enable) {
        state[chatId] = true;
    } else {
        delete state[chatId];
    }
    
    writeState('antisticker', state);
    await sock.sendMessage(chatId, { 
        text: `✅ Anti-sticker ${enable ? 'enabled' : 'disabled'} for this group!` 
    }, { quoted: message });
}

/**
 * Handle sticker detection for anti-sticker
 */
async function handleAntiSticker(sock, chatId, message, senderId) {
    const state = readState('antisticker', {});
    if (!state[chatId]) return false;

    if (message.message?.stickerMessage) {
        try {
            await sock.sendMessage(chatId, { delete: message.key });
            await sock.sendMessage(chatId, { 
                text: `⚠️ Sticker deleted! Anti-sticker is enabled in this group.`,
                mentions: [senderId]
            });
            return true;
        } catch (e) {
            console.error('Anti-sticker delete error:', e);
        }
    }
    return false;
}

// ==================== ANTI-BOT COMMAND ====================

/**
 * Toggle anti-bot mode (auto-remove bots)
 * Usage: .antibot on/off
 */
async function antibotCommand(sock, chatId, message, args) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    const state = readState('antibot', {});
    const argStr = (args || '').trim().toLowerCase();

    if (!argStr || !['on', 'off', 'status'].includes(argStr)) {
        return await sock.sendMessage(chatId, {
            text: `*ANTI-BOT*\n\n.antibot on - Enable auto-remove bots\n.antibot off - Disable\n.antibot status - Check status\n\nCurrent: ${state[chatId] ? 'ON' : 'OFF'}`
        }, { quoted: message });
    }

    if (argStr === 'status') {
        return await sock.sendMessage(chatId, { 
            text: `Anti-bot is currently *${state[chatId] ? 'ON' : 'OFF'}* in this group.` 
        }, { quoted: message });
    }

    const enable = argStr === 'on';
    if (enable) {
        state[chatId] = true;
    } else {
        delete state[chatId];
    }
    
    writeState('antibot', state);
    await sock.sendMessage(chatId, { 
        text: `✅ Anti-bot ${enable ? 'enabled' : 'disabled'} for this group!` 
    }, { quoted: message });
}

/**
 * Handle new participants for anti-bot
 */
async function handleAntiBot(sock, chatId, participants) {
    const state = readState('antibot', {});
    if (!state[chatId]) return;

    for (const participant of participants) {
        // Check if it's a bot (typically bots have different JID formats)
        if (participant.includes('bot') || participant.includes('Bot')) {
            try {
                await sock.groupParticipantsUpdate(chatId, [participant], 'remove');
                await sock.sendMessage(chatId, {
                    text: `🤖 Removed bot: @${participant.split('@')[0]}`,
                    mentions: [participant]
                });
            } catch (e) {
                console.error('Anti-bot remove error:', e);
            }
        }
    }
}

// ==================== ANTI-FORWARD COMMAND ====================

/**
 * Toggle anti-forward mode (delete forwarded messages)
 * Usage: .antiforward on/off
 */
async function antiforwardCommand(sock, chatId, message, args) {
    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, { text: '❌ This command only works in groups!' }, { quoted: message });
    }

    // Check if sender is admin
    const isAdmin = require('../lib/isAdmin');
    const senderId = message.key.participant || message.key.remoteJid;
    const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
    
    if (!isSenderAdmin) {
        return await sock.sendMessage(chatId, {
            text: '❌ Only group admins can manage anti-forward settings.'
        }, { quoted: message });
    }

    const state = readState('antiforward', {});
    const argStr = (args || '').trim().toLowerCase();

    if (!argStr || !['on', 'off', 'status'].includes(argStr)) {
        return await sock.sendMessage(chatId, {
            text: `*ANTI-FORWARD*\n\n.antiforward on - Enable anti-forward protection\n.antiforward off - Disable\n.antiforward status - Check status\n\nCurrent: ${state[chatId] ? 'ON' : 'OFF'}`
        }, { quoted: message });
    }

    if (argStr === 'status') {
        return await sock.sendMessage(chatId, { 
            text: `Anti-forward is currently *${state[chatId] ? 'ON' : 'OFF'}* in this group.` 
        }, { quoted: message });
    }

    const enable = argStr === 'on';
    if (enable) {
        state[chatId] = true;
    } else {
        delete state[chatId];
    }
    
    writeState('antiforward', state);
    await sock.sendMessage(chatId, { 
        text: `✅ Anti-forward ${enable ? 'enabled' : 'disabled'} for this group!` 
    }, { quoted: message });
}

/**
 * Handle forward detection
 */
async function handleAntiForward(sock, chatId, message, senderId) {
    const state = readState('antiforward', {});
    if (!state[chatId]) return false;

    // Check if message is forwarded
    const isForwarded = message.message?.extendedTextMessage?.contextInfo?.isForwarded ||
                       message.message?.imageMessage?.contextInfo?.isForwarded ||
                       message.message?.videoMessage?.contextInfo?.isForwarded;

    if (isForwarded) {
        try {
            await sock.sendMessage(chatId, { delete: message.key });
            await sock.sendMessage(chatId, { 
                text: `⚠️ @${senderId.split('@')[0]}, forwarded messages are not allowed in this group!`,
                mentions: [senderId]
            });
            return true;
        } catch (e) {
            console.error('Anti-forward delete error:', e);
        }
    }
    return false;
}

// ==================== MEDIA CONVERSION COMMANDS ====================

/**
 * Convert video to audio (optimized for speed)
 * Usage: .toaudio (reply to video)
 */
async function toAudioCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg?.videoMessage) {
            return await sock.sendMessage(chatId, { text: '❌ Please reply to a video!' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: '⏳ Converting video to audio...' }, { quoted: message });

        const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
        const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, buffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('mp3')
                .audioBitrate(128)
                .audioCodec('libmp3lame')
                .audioChannels(2)
                .audioFrequency(44100)
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });

        const audioBuffer = fs.readFileSync(outputPath);
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: message });

        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    } catch (error) {
        console.error('ToAudio error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error converting video to audio!' }, { quoted: message });
    }
}

/**
 * Convert video to video note (rounded)
 * Usage: .volvideo (reply to video)
 */
async function volvideoCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg?.videoMessage && !quotedMsg?.imageMessage) {
            return await sock.sendMessage(chatId, { text: '❌ Please reply to a video!' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: '⏳ Converting to video note...' }, { quoted: message });

        const stream = await downloadContentFromMessage(quotedMsg.videoMessage || quotedMsg.imageMessage, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        await sock.sendMessage(chatId, {
            video: buffer,
            gifPlayback: false,
            ptv: true
        }, { quoted: message });

    } catch (error) {
        console.error('Volvideo error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error converting to video note!' }, { quoted: message });
    }
}

/**
 * Convert media to view once
 * Usage: .toviewonce (reply to image/video/audio)
 */
async function toViewOnceCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (quotedMsg?.imageMessage) {
            const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(chatId, {
                image: buffer,
                viewOnce: true,
                caption: quotedMsg.imageMessage.caption || ''
            }, { quoted: message });
        } else if (quotedMsg?.videoMessage) {
            const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(chatId, {
                video: buffer,
                viewOnce: true,
                caption: quotedMsg.videoMessage.caption || ''
            }, { quoted: message });
        } else if (quotedMsg?.audioMessage) {
            const stream = await downloadContentFromMessage(quotedMsg.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(chatId, {
                audio: buffer,
                viewOnce: true,
                mimetype: quotedMsg.audioMessage.mimetype || 'audio/mpeg',
                ptt: quotedMsg.audioMessage.ptt || false
            }, { quoted: message });
        } else {
            return await sock.sendMessage(chatId, { text: '❌ Please reply to an image, video, or audio!' }, { quoted: message });
        }
    } catch (error) {
        console.error('ToViewOnce error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error converting to view once!' }, { quoted: message });
    }
}

/**
 * Edit caption of sent media
 * Usage: .editcaption new caption text (reply to bot's media message)
 */
async function editCaptionCommand(sock, chatId, message, args) {
    try {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedKey = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
        
        if (!quotedMsg || (!quotedMsg.imageMessage && !quotedMsg.videoMessage)) {
            return await sock.sendMessage(chatId, { text: '❌ Please reply to an image or video message!' }, { quoted: message });
        }

        const newCaption = args || '';
        
        if (!newCaption.trim()) {
            return await sock.sendMessage(chatId, { text: '❌ Please provide a new caption!\nUsage: .editcaption <new caption>' }, { quoted: message });
        }

        // Delete old message and resend with new caption
        if (quotedMsg.imageMessage) {
            const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(chatId, {
                image: buffer,
                caption: newCaption
            });
        } else if (quotedMsg.videoMessage) {
            const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(chatId, {
                video: buffer,
                caption: newCaption
            });
        }

        await sock.sendMessage(chatId, { text: '✅ Caption updated!' }, { quoted: message });
    } catch (error) {
        console.error('EditCaption error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error editing caption!' }, { quoted: message });
    }
}

// ==================== BLOCK/UNBLOCK COMMANDS ====================

/**
 * Block user (reply to their message)
 * Usage: .block (reply to user)
 */
async function blockCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
        const targetJid = quotedMsg?.participant || quotedMsg?.remoteJid;

        if (!targetJid || targetJid.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { text: '❌ Please reply to a user message to block them!' }, { quoted: message });
        }

        await sock.updateBlockStatus(targetJid, 'block');
        await sock.sendMessage(chatId, { 
            text: `✅ Blocked @${targetJid.split('@')[0]}`,
            mentions: [targetJid]
        }, { quoted: message });
    } catch (error) {
        console.error('Block error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error blocking user!' }, { quoted: message });
    }
}

/**
 * Unblock all blocked users
 * Usage: .unblockall
 */
async function unblockAllCommand(sock, chatId, message) {
    try {
        const blockedList = await sock.fetchBlocklist();
        
        if (blockedList.length === 0) {
            return await sock.sendMessage(chatId, { text: '✅ No blocked users found!' }, { quoted: message });
        }

        for (const jid of blockedList) {
            await sock.updateBlockStatus(jid, 'unblock');
        }

        await sock.sendMessage(chatId, { 
            text: `✅ Unblocked ${blockedList.length} user(s)!` 
        }, { quoted: message });
    } catch (error) {
        console.error('UnblockAll error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error unblocking users!' }, { quoted: message });
    }
}

// ==================== AUTO-REACTION COMMAND ====================

/**
 * Toggle auto-reaction (pm/gr)
 * Usage: .autoreaction pm on/off or .autoreaction gr on/off
 */
async function autoreactionCommand(sock, chatId, message, args) {
    // Check if sender is the owner
    if (!message.key.fromMe) {
        return await sock.sendMessage(chatId, { 
            text: '🚫 Only owner of the bot can use this command!' 
        }, { quoted: message });
    }

    const defaultReactions = [
        '❤️', '💕', '💖', '💗', '💓', '💞', '💝', '💘',
        '😊', '😍', '🥰', '😘', '😻', '🤗', '🥳', '😎',
        '👍', '👏', '🙌', '👌', '✌️', '🤞', '🤝', '💪',
        '🔥', '⚡', '✨', '💯', '⭐', '🌟', '💫', '🌈',
        '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💝',
        '😂', '🤣', '😄', '😁', '🙂', '🤩', '😇', '🥺',
        '💐', '🌹', '🌺', '🌸', '🌼', '🌻', '🌷', '🪷'
    ];
    
    const state = readState('autoreaction', { pm: false, gr: false, reactions: defaultReactions });
    const argParts = (args || '').trim().toLowerCase().split(' ');
    const [mode, action] = argParts;

    if (!mode || !['pm', 'gr'].includes(mode)) {
        return await sock.sendMessage(chatId, {
            text: `*AUTO-REACTION*\n\n.autoreaction pm on - Enable for private messages\n.autoreaction pm off - Disable for PM\n.autoreaction gr on - Enable for groups\n.autoreaction gr off - Disable for groups\n\nCurrent Status:\nPM: ${state.pm ? 'ON' : 'OFF'}\nGroups: ${state.gr ? 'ON' : 'OFF'}\n\nEmojis: ${state.reactions.length} reactions loaded 🎨`
        }, { quoted: message });
    }

    if (!action || !['on', 'off'].includes(action)) {
        return await sock.sendMessage(chatId, { 
            text: `❌ Use: .autoreaction ${mode} on/off` 
        }, { quoted: message });
    }

    state[mode] = action === 'on';
    if (!state.reactions || state.reactions.length < 30) {
        state.reactions = defaultReactions;
    }
    writeState('autoreaction', state);

    await sock.sendMessage(chatId, { 
        text: `✅ Auto-reaction for ${mode === 'pm' ? 'private messages' : 'groups'} ${action === 'on' ? 'enabled' : 'disabled'}!\n\n${state.reactions.length} emojis ready 🎨` 
    }, { quoted: message });
}

/**
 * Handle auto-reaction for messages (Optimized for speed)
 */
async function handleAutoReaction(sock, chatId, message, isGroup) {
    try {
        const defaultReactions = [
            '❤️', '💕', '💖', '💗', '💓', '💞', '💝', '💘',
            '😊', '😍', '🥰', '😘', '😻', '🤗', '🥳', '😎',
            '👍', '👏', '🙌', '👌', '✌️', '🤞', '🤝', '💪',
            '🔥', '⚡', '✨', '💯', '⭐', '🌟', '💫', '🌈',
            '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💝',
            '😂', '🤣', '😄', '😁', '🙂', '🤩', '😇', '🥺',
            '💐', '🌹', '🌺', '🌸', '🌼', '🌻', '🌷', '🪷'
        ];
        
        const state = readState('autoreaction', { pm: false, gr: false, reactions: defaultReactions });
        
        const shouldReact = isGroup ? state.gr : state.pm;
        if (!shouldReact) return false;

        if (message.key.fromMe) return false;

        const reactions = state.reactions && state.reactions.length > 0 ? state.reactions : defaultReactions;
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];

        setImmediate(async () => {
            try {
                await sock.sendMessage(chatId, {
                    react: {
                        text: randomReaction,
                        key: message.key
                    }
                });
            } catch (e) {
                console.error('Auto-reaction send error:', e);
            }
        });

        return true;
    } catch (e) {
        console.error('Auto-reaction error:', e);
        return false;
    }
}

// ==================== REAL OWNER COMMAND ====================

/**
 * Display real owner information with auto-updating age
 * Usage: .realowner
 */
async function realownerCommand(sock, chatId, message) {
    try {
        const axios = require('axios');
        
        const birthDate = new Date('1111-11-11');
        const now = new Date();
        
        const somaliaOffset = 3 * 60;
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const somaliaTime = new Date(utc + (somaliaOffset * 60000));
        
        let age = somaliaTime.getFullYear() - birthDate.getFullYear();
        const monthDiff = somaliaTime.getMonth() - birthDate.getMonth();
        const dayDiff = somaliaTime.getDate() - birthDate.getDate();
        
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }
        
        const nextBirthday = new Date(somaliaTime.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < somaliaTime) {
            nextBirthday.setFullYear(somaliaTime.getFullYear() + 1);
        }
        const daysUntilBirthday = Math.ceil((nextBirthday - somaliaTime) / (1000 * 60 * 60 * 24));
        
        const ownerInfo = `
╔═══════════════════════╗
║   👑 REAL OWNER INFO   ║
╚═══════════════════════╝

📛 *Name:* Aadhixd
✨ *Nickname:* Nick
🌍 *Location:* India, Kerala
🎂 *Birth Date:* june 1111
👤 *Current Age:* ${age} years old
⏰ *Next Birthday:* ${daysUntilBirthday} days

━━━━━━━━━━━━━━━━━━━━
🕰️ *Local Time:* ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
📅 *Date:* ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric' })}
━━━━━━━━━━━━━━━━━━━━

💫 *Bot Owner & Developer*
🚀 *Aadhixd,ZORO MD*
        `.trim();

        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Aadhixd (ZORO MD)
TEL;waid=918136880986:918136880986
NOTE:Age: ${age} | Location: Kerala
END:VCARD`;

        const imageUrl = 'https://i.postimg.cc/LsML554Y/zoro-md.jpg';
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: ownerInfo
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            contacts: { 
                displayName: 'ROMEO (ZORO MD)', 
                contacts: [{ vcard }] 
            }
        });

    } catch (error) {
        console.error('Realowner error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error fetching owner information!' }, { quoted: message });
    }
}

// Export all commands
module.exports = {
    // Group join requests
    approveCommand,
    disapproveCommand,
    
    // Profile pictures
    getGroupPPCommand,
    getPPCommand,
    
    // Group management
    groupIdCommand,
    closeGroupCommand,
    openGroupCommand,
    
    // Anti features
    antistickerCommand,
    handleAntiSticker,
    antibotCommand,
    handleAntiBot,
    antiforwardCommand,
    handleAntiForward,
    
    // Media conversion
    toAudioCommand,
    volvideoCommand,
    toViewOnceCommand,
    editCaptionCommand,
    
    // Block/Unblock
    blockCommand,
    unblockAllCommand,
    
    // Auto-reaction
    autoreactionCommand,
    handleAutoReaction,
    
    // Real owner
    realownerCommand
};
