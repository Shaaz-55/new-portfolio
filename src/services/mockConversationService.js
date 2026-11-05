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

function reply(content, topic, { projectId = null, links = [], projects = [], aspect = null, previousContext } = {}) {
  return {
    content, topic, source: "local-demo", links, projects, aspect,
    context: topic === "acknowledgement" || topic === "fallback"
      ? { ...(previousContext || emptyConversationContext()) }
      : { projectId, topic },
  };
}

function projectAspect(text) {
  if (/\b(github|repository|repo|demo|source code|links?|urls?)\b/.test(text) && !/\b(used|technolog\w*|tech stack|integrat\w*)\b/.test(text)) return "links";
  if (/\b(monetis\w*|monetiz\w*|business model|make money)\b/.test(text)) return "monetisation";
  if (/\b(user counts?|how many users|revenue|earnings|profit|clients?|partnerships?|awards?|won|winner|team size|funding)\b/.test(text)) return "unpublished";
  if (/\b(epochs?|learning rate|batch size|optimizer|optimiser|split ratio|dataset source|category names|class names|10 classes|ten classes)\b/.test(text)) return "unpublishedTechnical";
  if (/\b(clinical\w*|guide dog|replace|reliable enough|safe to use)\b/.test(text)) return "safety";
  if (/\b(accuracy|accurate|top 3|top three|metrics?|benchmarks?|latency|milliseconds?|inference|dataset|how many images|how many categories)\b/.test(text)) return "metrics";
  if (/\b(risk|delays?|disruptions?)\b/.test(text) && /\b(how|calculat\w*|formula|weights?)\b/.test(text)) return "risk";
  if (/\b(rerout\w*|alternative routes?|osrm)\b/.test(text) || /\bhow\b.*\brout\w*/.test(text)) return "routing";
  if (/\b(map|maps|leaflet|markers|tour|tours)\b/.test(text)) return "maps";
  if (/\bwhy\b.*\breact\b/.test(text)) return "react";
  if (/\b(test|testing|validate|validation)\b/.test(text)) return "testing";
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
  else if (aspect === "safety") content = `${project.name} is documented as: ${project.status}. I haven't supplied a safety validation or replacement claim for it.`;
  else if (aspect === "links") content = project.liveDemoUrl || project.githubUrl
    ? `The supplied links for ${project.name} are in its project card below. Any missing links haven't been added to the archive yet.`
    : `I haven't added verified Live Demo or GitHub links for ${project.name} yet. You can explore its documented details below.`;
  else if (project.details?.[aspect]) content = project.details[aspect];
  else if (aspect === "technologies") content = project.technologies.length
    ? `For ${project.name}, the documented technologies are ${project.technologies.join(', ')}. ${project.contribution}`
    : `The technology stack for ${project.name} isn't currently documented. I can show the supplied screenshots, but I won't infer frameworks or services from the interface.`;
  else if (aspect === "implementation") content = project.implementation?.length
    ? `For ${project.name}, here's the implementation:\n\n${project.implementation.map(step => '• ' + step).join('\n')}\n\n${project.id === 'waste' ? wasteMetrics() : project.contribution}`
    : `A detailed implementation breakdown for ${project.name} isn't currently available. ${project.contribution}`;
  else if (aspect === "testing") content = project.id === "waste"
    ? `${project.challenge} ${wasteMetrics()}`
    : `A project-specific testing record for ${project.name} isn't currently available. I can explain its documented implementation, but I won't claim test coverage or results that haven't been supplied.`;
  else if (aspect === "date") content = project.date ? `${project.name} is dated ${project.date} in my portfolio. ${project.status}.` : `I haven't supplied a date for ${project.name}. ${project.status}.`;
  else if (aspect === "status") content = `${project.name}: ${project.status}. ${project.id === 'aayam' ? project.contribution : ''}`;
  else if (aspect === "monetisation") content = project.monetisation || `I haven't supplied an executed business model for ${project.name}. Hypothetically, I'd first validate the problem and repeated use before testing willingness to pay; this is a proposal, not revenue already earned.`;
  else content = project[aspect] || `That specific detail isn't supplied for ${project.name}. ${project.contribution}`;
  const selectedImage = project.images?.find(image => includesPhrase(text, image.id) || includesPhrase(text, `${image.id}s`) || includesPhrase(text, image.label))?.id || "cover";
  return reply(content, project.id, {
    projectId: project.id, aspect,
    projects: [{ ...project, selectedImage }],
  });
}

function intentResponse(id, previousContext) {
  const links = id === "resume" ? [
    { label: "Open resume (PDF)", href: portfolioData.resume.url },
    { label: "Download resume", href: portfolioData.resume.url, download: portfolioData.resume.filename },
  ] : id === "contact" ? Object.values(contactLinks) : contactLinks[id] ? [contactLinks[id]] : [];
  const projectId = ["featured", "challenge", "ai"].includes(id) ? "waste"
    : ["react", "projectImprovement", "productImprovement"].includes(id) ? "unibuddy" : null;
  const projects = id === "projects" ? portfolioData.projects : projectId ? [projectById(projectId)] : [];
  return reply(mockResponses[id](), id, { links, projects, projectId, previousContext });
}

export function findResponse(question, context = emptyConversationContext()) {
  const text = normaliseQuestion(question);
  const rule = intentRules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(text)));
  // AAYAM can refer to a website or event leadership; explicit event questions win.
  if (/\b(aayam|techfest|robo soccer|line maze)\b/.test(text) && /\b(leadership|led|lead|organis\w*|organiz\w*|event lead|activities)\b/.test(text)) {
    return intentResponse("leadership", context);
  }
  // Normalisation removes apostrophes, so also recognise possessive names such as "Sehat's".
  const named = portfolioData.projects.filter((project) => project.aliases.some((alias) => includesPhrase(text, alias) || includesPhrase(text, `${alias}s`)));
  if (named.length > 1) {
    return reply(`Here's the comparison:\n\n${named.map(project => `${project.name} — ${project.description}`).join("\n\n")}\n\nAsk about one project for its implementation or contribution.`, "comparison", { projects: named });
  }
  if (named.length === 1) return projectResponse(named[0], text);
  if (/\b(show|see|list|explore)\b.*\bprojects\b/.test(text)) return intentResponse("projects", context);

  const contextProject = projectById(context.projectId);
  const aspect = projectAspect(text);
  const hasReference = /\b(it|its|(the|this|that) (project|model|app))\b/.test(text) || (!rule && /\b(that|this)\b/.test(text));
  if (aspect && contextProject && hasReference) return projectResponse(contextProject, text);
  // Personal contact requests must not swallow a named project's repository or demo request.
  if (/\b(github|linkedin|linked in|email|e mail|contact)\b/.test(text) && /\b(my|your|you|shaaz|see|find|connect|reach)\b/.test(text) && !/\b(used|integrat\w*|technolog\w*|stack)\b/.test(text)) {
    const contactIntent = /\bcontact\b/.test(text) || /\bgithub\b.*\blinked ?in\b/.test(text) ? "contact" : /\bgithub\b/.test(text) ? "github" : /\blinked ?in\b/.test(text) ? "linkedin" : "email";
    return intentResponse(contactIntent, context);
  }
  if (/\b(show|see|view|display)\b.*\b(dashboard|maps?|messages?|mobile|screenshots?|gallery|wallet|split|reviews|services|consultation)\b/.test(text)) return projectResponse(contextProject || projectById("unibuddy"), text);
  if (/\b(train|trained|training|fine tuned)\b.*\b(model|cnn|machine learning)\b/.test(text) || /\b(model|cnn)\b.*\btrain\w*/.test(text)) return projectResponse(projectById("waste"), text);
  if (/\b(you|your)\b.*\bhardware\b/.test(text)) return projectResponse(projectById("voice-controlled"), text);

  if (aspect && contextProject && !rule) return projectResponse(contextProject, text);
  if (aspect && hasReference && !rule) return reply(`Which project do you mean? You can ask about ${portfolioData.projects.map(project => project.name).join(", ")}.`, "clarifyProject");
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
