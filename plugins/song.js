Const yts = require('yt-search');
Const axios = require('axios');

// Aswin Sparky API ഫങ്ഷനുകൾ ചേർത്തിരിക്കുന്നു
Async function getJson(url) {
    Const res = await axios.get(url);
    Return res.data;
}

Async function ytv(url) {
    Try {
        Let resData = await getJson('https://api-aswin-sparky.koyeb.app/api/downloader/ytv?url=' + url);
        Return resData?.data?.url || resData?.url;
    } catch (e) {
        Console.error('YTV API Error:', e.message);
        Throw e;
    }
}

Async function yta(queryOrUrl) {
    Try {
        // ലിങ്ക് ആണെങ്കിൽ നേരിട്ട് എണ്ണാം അല്ലെങ്കിൽ സെർച്ച് ചെയ്യാം
        Let apiUrl = queryOrUrl.includes('youtube.com') || queryOrUrl.includes('youtu.be') 
            ? 'https://api-aswin-sparky.koyeb.app/api/downloader/ytv?url=' + queryOrUrl 
            : 'https://api-aswin-sparky.koyeb.app/api/downloader/song?search=' + encodeURIComponent(queryOrUrl);
            
        Let resData = await getJson(apiUrl);
        Return resData?.data?.url || resData?.data || resData?.url;
    } catch (e) {
        Console.error('YTA API Error:', e.message);
        Throw e;
    }
}

Async function songCommand(sock, chatId, message) {
    Try {
        Const fullText = message.message?.conversation || 
                         Message.message?.extendedTextMessage?.text || 
                         Message.message?.imageMessage?.caption || '';
        Const incomingText = fullText.trim();
        
        Const quotedContext = message.message?.extendedTextMessage?.contextInfo;
        
        If (quotedContext && (incomingText === '1' || incomingText === '2')) {
            await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });
            
            Const quotedMsg = quotedContext.quotedMessage;
            Const quotedText = quotedMsg?.conversation || 
                               QuotedMsg?.extendedTextMessage?.text || 
                               QuotedMsg?.imageMessage?.caption || 
                               QuotedMsg?.videoMessage?.caption || 
                               QuotedMsg?.documentMessage?.caption || '';

            Let targetUrl = null;
            Const linkMatch = quotedText.match(/(https?:\/\/[^\s]+)/);
            If (linkMatch) {
                TargetUrl = linkMatch[0];
            } else {
                Const stringifiedMsg = JSON.stringify(quotedMsg);
                Const fallbackMatch = stringifiedMsg.match(/(https?:\/\/[^\s"']+(?:youtube\.com|youtu\.be)[^\s"']*)/);
                TargetUrl = fallbackMatch ? fallbackMatch[0] : null;
            }

            If (!targetUrl) {
                Return await sock.sendMessage(chatId, { text: "❌ Session expired or link not found! Please search again using .song <name>" }, { quoted: message });
            }

            If (incomingText === '1') {
                await sock.sendMessage(chatId, { text: `📥 Downloading Audio (MP3)... Please wait.` }, { quoted: message });

                Let dlUrl = null;
                Try {
                    DlUrl = await yta(targetUrl);
                } catch (e) {
                    Console.error('Aswin Sparky Audio Error:', e.message);
                }

                If (!dlUrl) {
                    Return await sock.sendMessage(chatId, { text: "❌ Audio download failed from API." }, { quoted: message });
                }

                Const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
                Const audioBuffer = Buffer.from(audioRes.data);

                await sock.sendMessage(chatId, {
                    Audio: audioBuffer,
                    Mimetype: 'audio/mpeg',
                    FileName: `song.mp3`,
                    Ptt: false
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                Return;

            } else if (incomingText === '2') {
                await sock.sendMessage(chatId, { text: `📥 Downloading Video (MP4)... Please wait.` }, { quoted: message });

                Let videoDlUrl = null;
                Try {
                    VideoDlUrl = await ytv(targetUrl);
                } catch (e) {
                    Console.error('Aswin Sparky Video Error:', e.message);
                }

                If (!videoDlUrl) {
                    Return await sock.sendMessage(chatId, { text: "❌ Video download failed." }, { quoted: message });
                }

                await sock.sendMessage(chatId, {
                    Video: { url: videoDlUrl },
                    Mimetype: 'video/mp4',
                    Caption: `🎬 *Downloaded via Zoro MD*\n✨ *Created by Aadhixd*`,
                    FileName: `video.mp4`
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });
                Return;
            }
        }

        Const queryText = fullText.split(' ').slice(1).join(' ').trim();
        If (!queryText) {
            Return await sock.sendMessage(chatId, { 
                Text: '⭐ *𝗭𝗢𝗥𝗢-𝗠𝗗 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥* ⭐\n\n❌ *Error:* Please provide a song name!\n💡 *Example:* `.song Faded`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "⚡", key: message.key } });

        Const searchResults = await yts(queryText);
        Const video = searchResults?.videos?.[0];

        If (!video) {
            Return await sock.sendMessage(chatId, { text: "❌ *Oops!* No results found on YouTube!" }, { quoted: message });
        }

        Let thumbBuffer = null;
        Let imageToUse = null;
        
        Try {
            If (video.thumbnail) {
                Const thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 8000 });
                ThumbBuffer = Buffer.from(thumbRes.data);
                ImageToUse = thumbBuffer;
            }
        } catch (e) {}

        Const vidmateMenuText = `┌  📥 *𝗭𝗢𝗥𝗢-𝗠𝗗 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥* 📥
│
├  🎬 *Title:* ${video.title}
├  ⏱️ *Duration:* ${video.timestamp}
├  👀 *Views:* ${video.views}
├  🔗 *Link:* ${video.url}
│
---------------------------------------
│  👇 *Reply to this message with:*
│  *1️⃣* 🎵 Audio (MP3 Format)
│  *2️⃣* 🎥 Video (MP4 Format)
└─────────────────────────────────────
│  𝗢𝘄𝗻𝗲𝗿 & 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗱 𝗯𝘆 👑 𝗔𝗮𝗱𝗵𝗶𝘅𝗱 ⚡
└─────────────────────────────────────`;

        If (imageToUse) {
            await sock.sendMessage(chatId, {
                Image: imageToUse,
                Caption: vidmateMenuText
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: vidmateMenuText }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: "👑", key: message.key } });

    } catch (err) {
        Console.error('VidMate Style Error:', err.message);
        await sock.sendMessage(chatId, { text: `❌ *Error:* Failed to process VidMate request.` }, { quoted: message });
    }
}

Module.exports = songCommand;
