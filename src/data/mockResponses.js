import { portfolioData as p } from "./portfolioData.js";

const project = (id) => p.projects.find((item) => item.id === id);
const lines = (items) => items.map((item) => "• " + item).join("\n");
const skillList = (key) => p.skills[key].items.join(", ");
const waste = project("waste");

export function wasteMetrics() {
  const m = waste.metrics;
  return `I fine-tuned a ResNet50 model on ${m.images.toLocaleString("en-US")} images across ${m.categories} waste categories. On a ${m.evaluation}, it achieved ${m.accuracy} classification accuracy and ${m.top3Accuracy} top-3 accuracy.\n\nThe exported ONNX model averaged ${m.averageLatencyMs} ms per image on an ${m.hardware}. Top-3 accuracy is a separate metric: the correct class is among the three highest-ranked predictions. These are the supplied evaluation results, not a production deployment claim.`;
}

export function projectOverview(item) {
  if (item.id !== "waste") return item.overview;
  return `I built an AI-based household waste classifier to identify recyclable materials. ${wasteMetrics()}\n\nI used a two-stage training pipeline, stratified and duplicate-aware splitting, class weighting, and augmentation. I also built a Python CLI with structured JSON outputs, confidence-threshold analysis, and uncertainty handling.`;
}

function education() {
  return "I'm studying computer science. Here's my education record:\n\n" +
    p.education.map((entry) => `${entry.qualification}\n${entry.institution}${entry.university ? " · " + entry.university : ""}\n${entry.duration} · ${entry.grade.label}: ${entry.grade.value}${entry.grade.scale === "%" ? "%" : "/" + entry.grade.scale}`).join("\n\n");
}
function experience() {
  const role = p.experience[0];
  return `Alongside computer science, I've been working as a ${role.role} since ${role.startDate}. I focus on ${role.focus.toLowerCase()}.\n\nMy work includes ${role.work.join(", ").toLowerCase()}. I've explored client work through ${role.platforms.join(", ")}. This has helped me work with requirements, communicate with clients, and turn ideas into deliverables. I haven't published client names, earnings, or order counts.`;
}
function leadership() {
  const fest = p.leadership[0];
  return `At ${fest.organisation}, I served as ${fest.role} for ${fest.events.join(" and ")}. I've also led cross-functional teams in multiple hackathons. These experiences helped me develop coordination, decision-making, and problem-solving skills.\n\nI've participated in ${p.activities.map((event) => event.name).join(" and ")}. Outside technology, I played basketball with ${p.extracurriculars.basketball.team} at ${p.extracurriculars.basketball.event}; ${p.extracurriculars.basketball.result.toLowerCase()}.`;
}
function activity(id) {
  const event = p.activities.find((item) => item.id === id);
  return `At ${event.name}, organised by ${event.organiser} in ${event.date}, I ${event.participation.charAt(0).toLowerCase() + event.participation.slice(1)}. This is participation, not a claimed win or award.`;
}
function sports() {
  const sport = p.extracurriculars.basketball;
  return `I participated in basketball at ${sport.event} as part of ${sport.team}. ${sport.result}—a team result, not an individual medal. I also enjoy ${p.extracurriculars.other.join(", ").toLowerCase()}.`;
}

export const contactLinks = {
  email: { label: p.contact.email, href: `mailto:${p.contact.email}` },
  github: { label: "GitHub · Shaaz-55", href: p.contact.github },
  linkedin: { label: "LinkedIn · Shaaz Hemani", href: p.contact.linkedin },
};

export const mockResponses = {
  identity: () => p.identity.introduction,
  education,
  interests: () => `I'm interested in ${p.interests.join(", ").toLowerCase()}. I enjoy connecting these areas through working prototypes, especially where technology can solve an everyday problem.`,
  projects: () => `My projects span web development, AI, accessibility, and robotics:\n\n${p.projects.map((item) => `${item.name}${item.date ? " · " + item.date : ""}\n${item.description}`).join("\n\n")}\n\nAsk about one and I can explain the implementation, my contribution, or possible next steps.`,
  featured: () => `A strong technical example to explore is ${waste.name}. ${projectOverview(waste)}`,
  skills: () => `${Object.values(p.skills).map((group) => `${group.label}: ${group.items.join(", ")}`).join("\n\n")}\n\n${p.skillProficiency}`,
  languages: () => `I've used or explored ${skillList("languages")}. Python connects to my model-training and logistics work; JavaScript, HTML, and CSS appear across my web projects. ${p.skillProficiency}`,
  web: () => `My web-development toolkit includes ${skillList("web")}. UniBuddy is a concrete React example with reusable components and shared contexts. My experience varies by tool; I haven't supplied a separate Node.js or Express project breakdown.`,
  react: () => project("unibuddy").details.react,
  python: () => `I've used Python in the waste-classification workflow, including model training, evaluation, and a CLI with structured JSON output. Python and Flask are also part of LogiSense's documented stack. ${p.skillProficiency}`,
  databases: () => `I've used or explored ${skillList("databases")}. A concrete example is Firebase integration in my initial AAYAM website for event registrations and participant data. I haven't supplied detailed production-scale database benchmarks.`,
  ai: () => `I've explored ${skillList("ai")}. My most concrete model-training example here is the household waste classifier. ${wasteMetrics()}`,
  apis: () => `I've worked on API integration in LogiSense using ${project("logisense").technologies.filter((item) => ["OSRM", "AISStream", "OpenWeatherMap", "GDACS"].includes(item)).join(", ")}. My robot interface also integrates Google Translate API for voice input. OAuth 2.0 is among the concepts I've explored, with depth varying by area.`,
  tools: () => `I've used or explored ${skillList("tools")}. Fusion 360 is central to my freelance product modelling; Git and GitHub support my development workflow. I haven't supplied a production AWS architecture or infrastructure benchmark.`,
  fundamentals: () => `My computer science foundations include ${skillList("fundamentals")}. ${p.skillProficiency}`,
  proficiency: () => p.skillProficiency,
  experience,
  leadership,
  sports,
  hackathons: () => `${p.activities.map((event) => activity(event.id)).join("\n\n")}\n\nI've also led cross-functional teams in hackathons.`,
  pitch: () => activity("dragons-den"),
  vibeathon: () => activity("vibeathon"),
  entrepreneurship: () => `I'm interested in entrepreneurship because I want to turn useful ideas into products people use. My long-term ambition is to ${p.ambitions.longTerm.charAt(0).toLowerCase() + p.ambitions.longTerm.slice(1)}\n\n${activity("dragons-den")}`,
  ambitions: () => p.ambitions.fiveYears,
  motivation: () => p.reflections.motivation,
  strengths: () => p.reflections.strengths,
  weakness: () => p.reflections.weakness,
  failure: () => p.reflections.failure,
  learning: () => p.reflections.learning,
  problemSolving: () => p.proposals.problemSolving,
  debugging: () => p.proposals.debugging,
  technologyChoice: () => p.proposals.technologyChoice,
  learningApproach: () => p.proposals.learning,
  disagreement: () => p.proposals.disagreement,
  challenge: () => `A technically demanding example is the waste classifier. ${waste.challenge}`,
  selection: () => `I'd bring a mix of practical building, curiosity, and ownership. My work spans reusable web interfaces, a carefully evaluated ML model, browser-to-robot communication, and product design. I've also coordinated technical events and led hackathon teams.\n\nI'd contribute by understanding the problem, making a prototype, and improving it with feedback. For this opportunity, I'd like to bring that product-building approach to useful voice-first experiences; I won't promise outcomes I haven't demonstrated.`,
  wisprGrowth: () => p.proposals.wisprGrowth,
  budget: () => p.proposals.budget,
  voice: () => p.proposals.voice,
  contact: () => "You can reach me by email, explore my code on GitHub, or connect with me on LinkedIn using the links below.",
  github: () => "Here's my GitHub profile, where you can explore my code.",
  linkedin: () => "You can connect with me on LinkedIn through the link below.",
  email: () => "You can email me using the link below.",
  unavailable: () => "I haven't supplied that information in this personal archive, so I won't invent it. I can explain my documented projects, education, freelance design work, leadership, and interests.",
  wisprHistory: () => "I haven't supplied any executed Wispr Flow campaign, partnership, or acquisition results. The growth and ₹3,000-budget answers here are proposed experiments. You can ask how I'd approach one.",
  acknowledgement: () => "You're welcome. Ask about a project, my education, freelance work, or what I want to build next.",
};

// Specific rules precede general interview topics. These are local patterns, not an AI model.
export const intentRules = [
  { id: "wisprHistory", patterns: [/wispr.*\b(partnership|partnered|results|executed|acquired|customers|won)\b/, /\b(past|previous|executed)\b.*wispr/] },
  { id: "budget", patterns: [/\b(3000|3 000|budget|rupees)\b/] },
  { id: "wisprGrowth", patterns: [/\bwispr\b.*\b(grow|growth|india|market|promot|campaign|help|adoption)\w*/, /\b(grow|growth|market|promote)\w*.*\bwispr\b/] },
  { id: "voice", patterns: [/\bwispr\b/, /\b(voice first|voice typing|voice technology|voice products)\b/] },
  { id: "disagreement", patterns: [/\b(disagreements?|conflicts?)\b.*\b(handle|team|resolve|deal)\b/, /\b(handle|resolve|deal)\b.*\b(disagreements?|conflicts?)\b/] },
  { id: "technologyChoice", patterns: [/\b(choose|decide|pick|select)\b.*\b(technology|technologies|stack|framework|tools?)\b/] },
  { id: "debugging", patterns: [/\b(debug|debugging|troubleshoot)\b/, /\b(doesnt|does not|isnt|is not) work\b/] },
  { id: "learningApproach", patterns: [/\bhow\b.*\b(learn|learning)\b/, /\blearn\b.*\b(new|unfamiliar)\b/] },
  { id: "problemSolving", patterns: [/\b(approach|solve|tackle|break down)\b.*\b(unfamiliar|complex|problem)\w*/, /\bunfamiliar problem\b/] },
  { id: "weakness", patterns: [/\b(weakness|weaknesses)\b/, /\bimprove\b.*\b(yourself|about you)\b/] },
  { id: "failure", patterns: [/\b(failure|failed|mistake|setback)\b/] },
  { id: "unavailable", patterns: [/\b(phone|salary|earnings|clients names|client names|internship|internships|awards?|medals?|won|winner|winning|revenue|user count|users have)\b/, /\b(resume|cv)\b/] },
  { id: "email", patterns: [/\b(email|e mail)\b/] },
  { id: "github", patterns: [/\bgithub\b/] },
  { id: "linkedin", patterns: [/\blinked ?in\b/] },
  { id: "contact", patterns: [/\bcontact\b/, /\b(connect|reach|get in touch)\b.*\b(you|shaaz)\b/] },
  { id: "pitch", patterns: [/\b(pitched?|dragons? den|yugaantar)\b/] },
  { id: "vibeathon", patterns: [/\b(vibeathon|polaris|replit|multi leg travel|48 hour)\b/] },
  { id: "hackathons", patterns: [/\bhackathons?\b/] },
  { id: "sports", patterns: [/\b(basketball|jubilee|global encounters|team india|sports?|badminton|chess|table tennis|extracurricular)\b/] },
  { id: "leadership", patterns: [/\b(leadership|activities|organised|organized|event lead|robo soccer|line maze)\b/, /\b(led|lead|role|contribute)\b.*\b(team|events?)\b/] },
  { id: "experience", patterns: [/\b(freelanc\w*|fiverr|upwork|fusion 360|cad|manufactur\w*|product designer|product design experience|3d print\w*)\b/, /\b(work experience|professional experience|work history)\b/, /^\s*(tell me about )?your experience\s*$/] },
  { id: "education", patterns: [/\b(education|studying|study|cgpa|gpa|graduat\w*|university|svyasa|newton|btech|b tech|class xii|class x|class 12|class 10|schooling|academic|gujarat public|bright day)\b/, /\b(which|where|your)\b.*\b(college|school|degree)\b/] },
  { id: "identity", patterns: [/\b(who are you|who is shaaz|who s shaaz|tell me about yourself|about yourself|your background|your introduction|introduce yourself|give me your introduction)\b/, /^what do you (do|know)( about (me|you|yourself|shaaz))?$/, /\beverything about (you|yourself|shaaz)\b/, /^(hi|hey|hello)( shaaz)?$/] },
  { id: "learning", patterns: [/\b(currently|now|these days)\b.*\blearn\w*/, /\blearn\w*.*\b(currently|now|these days)\b/] },
  { id: "interests", patterns: [/\b(your interests|your hobbies|interested in|enjoy building)\b/] },
  { id: "ambitions", patterns: [/\b(ambitions?|career|five years|5 years|long term|goals?)\b/, /\bwhere\b.*\bsee yourself\b/] },
  { id: "entrepreneurship", patterns: [/\b(startups?|entrepreneur\w*|company would|company do you|founder)\b/] },
  { id: "motivation", patterns: [/\b(drives? you|motivates? you|motivation|passion|problems do you|problem do you want|why do you build)\b/] },
  { id: "selection", patterns: [/\b(select|hire|choose)\b.*\byou\b/, /\b(opportunity|memorable|contribute to a team)\b/] },
  { id: "strengths", patterns: [/\b(strengths?|different|unique|sets you apart)\b/] },
  { id: "challenge", patterns: [/\b(hardest|difficult|challenging|technical challenge|challenge you faced)\b/] },
  { id: "featured", patterns: [/\b(best project|proud of|favourite project|favorite project)\b/] },
  { id: "proficiency", patterns: [/\b(proficien\w*|expert\w*|skill level|how good are you)\b/] },
  { id: "languages", patterns: [/\b(programming languages|coding languages|languages do you|languages you)\b/] },
  { id: "react", patterns: [/^(react|do you know react|have you (used|worked with) react)$/, /\b(your|you have|you know|you used)\b.*\breact\b/] },
  { id: "python", patterns: [/^python$/, /\b(you|your)\b.*\bpython\b/, /\bpython experience\b/] },
  { id: "web", patterns: [/^(node js|nodejs|express js|web development|frontend|full stack)$/, /\b(you|your)\b.*\b(node js|nodejs|express|tailwind|framer motion|web development|frontend|full stack)\b/] },
  { id: "databases", patterns: [/^(databases?|postgresql|mongodb|mysql|firebase)$/, /\b(you|your)\b.*\b(databases?|postgresql|mongodb|mysql|firebase)\b/] },
  { id: "apis", patterns: [/^apis?$/, /\b(you|your)\b.*\b(apis?|api integration|oauth)\b/] },
  { id: "tools", patterns: [/^(aws|linux|git|tools)$/, /\b(you|your)\b.*\b(aws|linux|git|tools|infrastructure)\b/] },
  { id: "fundamentals", patterns: [/\b(dsa|dbms|data structures|algorithms|computer science fundamentals)\b/] },
  { id: "ai", patterns: [/^(ai|artificial intelligence|machine learning)$/, /\b(you|your)\b.*\b(ai|artificial intelligence|machine learning|pytorch|langchain|llm)\b/] },
  { id: "skills", patterns: [/\b(your skills|technical skills|skills do you|your technical|your stack|what can you build|what can you do)\b/, /^skills$/] },
  { id: "projects", patterns: [/\b(your projects|projects have you|projects you|projects did you|show me your work|your portfolio|what have you built|what are you building)\b/, /^(projects|portfolio)$/] },
  { id: "acknowledgement", patterns: [/^(thanks|thank you|cool|nice|okay|ok)( shaaz)?$/] },
];

export const fallbackResponse = "I don't have a verified answer for that in this local personal archive. Try asking about my education, projects, technical skills, freelance work, leadership, or ambitions. These responses are predefined, so I won't make up information.";
