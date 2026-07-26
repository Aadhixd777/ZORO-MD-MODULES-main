const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = "YOUR_GEMINI_API_KEY";
const genAI = new GoogleGenerativeAI(apiKey);

async function geminiCommand(sock, chatId, message) {
    try {
        const textMsg = message.message?.conversation || 
                        message.message?.extendedTextMessage?.text || "";

        const trimmedText = textMsg.trim();

        const isAICommand = trimmedText.startsWith('.ai');
        const isGeminiCommand = trimmedText.startsWith('.gemini');

        if (!isAICommand && !isGeminiCommand) {
            return;
        }

        const prompt = trimmedText.replace(/^\.(ai|gemini)\s*/i, "").trim();

        if (!prompt) {
            await sock.sendMessage(chatId, { 
                text: '❓ Please provide a prompt after the command.\n\n*Example:* `.ai write a short poem`' 
            }, { quoted: message });
            return;
        }

        const tempMsg = await sock.sendMessage(chatId, { text: '🤖 Thinking...' }, { quoted: message });

        const systemInstruction = 
            "You are a helpful AI assistant. Detect the input language of the user's prompt " +
            "and respond fluently in the exact same language or script.";

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        await sock.sendMessage(chatId, { delete: tempMsg.key });

        await sock.sendMessage(chatId, { 
            text: responseText 
        }, { quoted: message });

    } catch (error) {
        console.error('Error in Gemini command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ An error occurred while generating a response from the AI.' 
        }, { quoted: message });
    }
}

module.exports = geminiCommand;