import { portfolioData } from "../data/portfolioData.js";
import { contactLinks, fallbackResponse, intentRules, mockResponses, projectOverview, wasteMetrics } from "../data/mockResponses.js";

import { MAX_INPUT_LENGTH, emptyConversationContext } from './conversationContract.js';
export { MAX_INPUT_LENGTH, emptyConversationContext } from './conversationContract.js';

export function normaliseQuestion(question) {
  return question.normalize("NFKC").toLowerCase()
    .replace(/(\d)[,.](?=\d{3}\b)/g, "$1")
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}
const includesPhrase = (text, phrase) => (" " + text + " ").includes(" " + normaliseQuestion(phrase) + " ");
const projectById = (id) => portfolioData.projects.find((project) => project.id === id);

function reply(content, topic, { projectId = null, links = [], aspect = null, previousContext } = {}) {
  return {
    content, topic, source: "local-demo", links, aspect,
    context: topic === "acknowledgement" || topic === "fallback"
      ? { ...(previousContext || emptyConversationContext()) }
      : { projectId, topic },
  };
}

function projectAspect(text) {
  if (/\b(monetis\w*|monetiz\w*|business model|make money)\b/.test(text)) return "monetisation";
  if (/\b(user counts?|how many users|revenue|earnings|profit|clients?|partnerships?|awards?|won|winner|team size|funding)\b/.test(text)) return "unpublished";
  if (/\b(epochs?|learning rate|batch size|optimizer|optimiser|split ratio|dataset source|category names|class names|10 classes|ten classes)\b/.test(text)) return "unpublishedTechnical";
  if (/\b(clinical\w*|guide dog|replace|reliable enough|safe to use)\b/.test(text)) return "safety";
  if (/\b(accuracy|accurate|top 3|top three|metrics?|benchmarks?|latency|milliseconds?|inference|dataset|how many images|how many categories)\b/.test(text)) return "metrics";
  if (/\b(risk|delays?|disruptions?)\b/.test(text) && /\b(how|calculat\w*|formula|weights?)\b/.test(text)) return "risk";
  if (/\b(rerout\w*|alternative routes?|osrm)\b/.test(text) || /\bhow\b.*\brout\w*/.test(text)) return "routing";
  if (/\b(map|maps|leaflet|markers|tour|tours)\b/.test(text)) return "maps";
  if (/\bwhy\b.*\breact\b/.test(text)) return "react";
  if (/\b(gemma|ollama|assistant|local ai)\b/.test(text)) return "ai";
  if (/\b(learned|learnt|learnings|takeaway)\b/.test(text) || /\bwhat\b.*\blearn\b/.test(text)) return "learning";
  if (/\b(challenges?|hardest|difficult|obstacles?|struggle)\b/.test(text)) return "challenge";
  if (/\b(improve|improvement|future|next steps?|scale|scaling)\b/.test(text)) return "future";
  if (/\b(your role|your contribution|contribute|personally|your part|who built)\b/.test(text) || /\bwhat did you (do|build)\b/.test(text)) return "contribution";
  if (/\b(technolog\w*|tech stack|frameworks?|languages?|tools?|apis?|libraries)\b/.test(text)) return "technologies";
  if (/\b(how|implementation|pipeline|architecture)\b/.test(text) && /\b(built|build|work|works|implement\w*|train\w*|create|pipeline|architecture)\b/.test(text)) return "implementation";
  if (/\bwhy\b/.test(text) || /\b(problem|purpose|motivation)\b/.test(text)) return "problem";
  if (/\b(when|date|timeline)\b/.test(text)) return "date";
  if (/\b(deployed|production|live|status)\b/.test(text)) return "status";
  if (/\b(tell me more|more detail|explain more|go deeper|elaborate)\b/.test(text)) return "implementation";
  return null;
}

function projectResponse(project, text) {
  const aspect = projectAspect(text) || "overview";
  let content;
  if (aspect === "overview") content = projectOverview(project);
  else if (aspect === "unpublished") content = `I haven't supplied verified user counts, revenue, client names, funding, or awards for ${project.name}. Its documented status is: ${project.status}. I can explain the work itself or discuss a clearly labelled future proposal.`;
  else if (aspect === "unpublishedTechnical") content = `I haven't supplied that exact training or dataset detail for ${project.name}, so I won't invent it. ${project.id === 'waste' ? 'The documented pipeline includes two-stage training, stratified and duplicate-aware splitting, class weighting, augmentation, and held-out evaluation.' : 'I can explain the documented implementation and technologies.'}`;
  else if (aspect === "metrics") content = project.id === "waste" ? wasteMetrics() : `I haven't published a verified accuracy, latency, or dataset benchmark for ${project.name}. ${project.status}. I can explain its implementation without borrowing metrics from a different project.`;
  else if (aspect === "safety") content = project.id === "safesteps"
    ? "SafeSteps is an assistive technology prototype. It is not a clinically validated navigation system and should not be presented as a replacement for a guide dog or professional mobility assistance. The explored features are object finding, voice interaction, navigation cues, position awareness, and proximity warnings."
    : `${project.name} is documented as: ${project.status}. I haven't supplied a safety validation or replacement claim for it.`;
  else if (project.details?.[aspect]) content = project.details[aspect];
  else if (aspect === "technologies") content = `For ${project.name}, the documented technologies are ${project.technologies.join(', ')}. ${project.id === 'safesteps' ? 'A specific model, framework, or distance sensor has not been supplied.' : project.contribution}`;
  else if (aspect === "implementation") content = `For ${project.name}, here's the implementation:\n\n${project.implementation.map(step => '• ' + step).join('\n')}\n\n${project.id === 'waste' ? wasteMetrics() : project.contribution}`;
  else if (aspect === "date") content = project.date ? `${project.name} is dated ${project.date} in my portfolio. ${project.status}.` : `I haven't supplied a date for ${project.name}. It's described as an ${project.status.toLowerCase()}.`;
  else if (aspect === "status") content = `${project.name}: ${project.status}. ${project.id === 'aayam' ? project.contribution : ''}`;
  else if (aspect === "monetisation") content = project.monetisation || `I haven't supplied an executed business model for ${project.name}. Hypothetically, I'd first validate the problem and repeated use before testing willingness to pay; this is a proposal, not revenue already earned.`;
  else content = project[aspect] || `That specific detail isn't supplied for ${project.name}. ${project.contribution}`;
  return reply(content, project.id, { projectId: project.id, aspect });
}

function intentResponse(id, previousContext) {
  const links = id === "contact" ? Object.values(contactLinks) : contactLinks[id] ? [contactLinks[id]] : [];
  const projectId = ["featured", "challenge", "ai"].includes(id) ? "waste" : null;
  return reply(mockResponses[id](), id, { links, projectId, previousContext });
}

export function findResponse(question, context = emptyConversationContext()) {
  const text = normaliseQuestion(question);
  const rule = intentRules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(text)));
  // AAYAM can refer to a website or event leadership; explicit event questions win.
  if (/\b(aayam|techfest|robo soccer|line maze)\b/.test(text) && /\b(leadership|led|lead|organis\w*|organiz\w*|event lead|activities)\b/.test(text)) {
    return intentResponse("leadership", context);
  }
  // Contact requests are intentional disclosure, not incidental mentions of a project's GitHub stack.
  if (/\b(github|linkedin|linked in|email|e mail|contact)\b/.test(text) && /\b(my|your|you|shaaz|see|find|connect|reach)\b/.test(text) && !/\b(used|integrat\w*|technolog\w*|stack)\b/.test(text)) {
    const contactIntent = /\bcontact\b/.test(text) || /\bgithub\b.*\blinked ?in\b/.test(text) ? "contact" : /\bgithub\b/.test(text) ? "github" : /\blinked ?in\b/.test(text) ? "linkedin" : "email";
    return intentResponse(contactIntent, context);
  }
  const named = portfolioData.projects.filter((project) => project.aliases.some((alias) => includesPhrase(text, alias)));
  if (named.length > 1) {
    return reply(named.map((project) => `${project.name} — ${project.description}\nTechnologies: ${project.technologies.join(', ')}.\nStatus: ${project.status}.`).join("\n\n") + "\n\nAsk about one project for its implementation or contribution.", "comparison");
  }
  if (named.length === 1) return projectResponse(named[0], text);
  if (/\b(train|trained|training|fine tuned)\b.*\b(model|cnn|machine learning)\b/.test(text) || /\b(model|cnn)\b.*\btrain\w*/.test(text)) return projectResponse(projectById("waste"), text);
  if (/\b(you|your)\b.*\bhardware\b/.test(text)) return projectResponse(projectById("robotics"), text);

  const aspect = projectAspect(text);
  const hasReference = /\b(it|its|that|this|the project|the model|the app)\b/.test(text);
  const independent = rule && !["projects", "challenge", "failure", "learningApproach", "technologyChoice", "unavailable"].includes(rule.id);
  const directFollowUp = aspect && (hasReference || !independent);
  if (directFollowUp && context.projectId) return projectResponse(projectById(context.projectId), text);
  if (directFollowUp && hasReference) return reply("Which project do you mean? You can ask about UniBuddy, the waste classifier, LogiSense, SafeSteps, AAYAM, the Parsley clone, or the voice-controlled robot.", "clarifyProject");
  if (rule) return intentResponse(rule.id, context);
  return reply(fallbackResponse, "fallback", { previousContext: context });
}

// UI-independent contract: content, topic, links, source and explicit per-conversation context.
// No mutable module-level history: different sessions cannot leak context into each other.
export const conversationService = {
  async reply(question, { signal, context } = {}) {
    if (!question.trim()) throw new Error("Please enter a question.");
    if (question.length > MAX_INPUT_LENGTH) throw new Error(`Keep your question under ${MAX_INPUT_LENGTH} characters.`);
    await new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 850);
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    });
    return findResponse(question, context);
  },
};
