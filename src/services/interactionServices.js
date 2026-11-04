import { createBrowserRecognition } from "./browserRecognition.js";
import { createFishAudioSynthesis } from "./fishAudioSynthesis.js";
import { conversationService } from "./mockConversationService.js";

// Swap one provider here without changing the other services or UI components.
export const interactionServices = {
  recognition: createBrowserRecognition(),
  synthesis: createFishAudioSynthesis(),
  conversation: conversationService,
};
