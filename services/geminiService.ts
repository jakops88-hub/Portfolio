import { ChatMessage } from '../types';

/**
 * Sends a message to the Python backend's /api/chat endpoint
 * The backend handles all Gemini API interactions including system prompts and function calling
 */
export const sendMessageToGemini = async (message: string, history: ChatMessage[] = []): Promise<string> => {
  try {
    // Call the Python FastAPI backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: history.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error("Backend error:", errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "I apologize, but I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Error sending message to backend:", error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return "Connection error. Please ensure the backend is running.";
    }
    return "Connection error. Please check your connection and try again.";
  }
};