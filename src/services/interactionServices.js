import { createBrowserRecognition } from "./browserRecognition.js";
import { createBrowserSynthesis } from "./browserSynthesis.js";
import { conversationService } from "./mockConversationService.js";

// Swap one provider here without changing the other services or UI components.
export const interactionServices = {
  recognition: createBrowserRecognition(),
  synthesis: createBrowserSynthesis(),
  conversation: conversationService,
};
