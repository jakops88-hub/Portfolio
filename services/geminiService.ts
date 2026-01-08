import { GoogleGenAI, Content } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';
import { ChatMessage } from '../types';

let chatSession: any = null;

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const initializeChat = async () => {
  try {
    const ai = getClient();
    // Using gemini-3-flash-preview for fast, text-based conversational responses
    chatSession = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7, // Balance between creativity and professional tone
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to initialize chat:", error);
    return false;
  }
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    await initializeChat();
  }
  
  try {
    const response = await chatSession.sendMessage({ message });
    return response.text || "I apologize, but I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "Connection error. Please check your API key and try again.";
  }
};