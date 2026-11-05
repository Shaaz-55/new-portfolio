import { useEffect, useRef } from "react";
import { suggestedQuestions } from "../../data/portfolioData.js";
import Icon from "../Icon.jsx";
import ProjectShowcase from "../ProjectShowcase.jsx";
import QuestionDirectory from "./QuestionDirectory.jsx";

export default function ConversationPanel({
  conversation,
  onQuestion,
  speech,
  onPlay,
  inputActive,
}) {
  const { messages, phase, error, announcement } = conversation;
  const scrollRef = useRef(null);
  const followRef = useRef(true);
  const questionRef = useRef(null);
  const richAnswerRef = useRef(null);
  useEffect(() => {
    const questionId = messages
      .filter((message) => message.role === "visitor")
      .at(-1)?.id;
    if (questionRef.current !== questionId) {
      questionRef.current = questionId;
      followRef.current = true;
      richAnswerRef.current = null;
    }
    const scroll = scrollRef.current;
    if (!scroll || !followRef.current) return;
    const latest = messages.at(-1);
    if (latest?.complete && latest.projects?.length) {
      if (richAnswerRef.current !== latest.id) {
        const article = scroll.querySelector(
          `[data-message-id="${latest.id}"]`,
        );
        if (article)
          scroll.scrollTop +=
            article.getBoundingClientRect().top -
            scroll.getBoundingClientRect().top;
        richAnswerRef.current = latest.id;
      }
    } else scroll.scrollTop = scroll.scrollHeight;
  }, [messages, phase]);
  return (
    <section
      className={`conversation-panel ${messages.length ? "has-conversation" : ""}`}
      aria-label="Conversation with Shaaz"
    >
      {messages.length === 0 ? (
        <div className="welcome-screen">
          <h1>
            Don't read my portfolio.
            <br />
            <em>Interrogate it.</em>
          </h1>
          <p>
            I'm Shaaz. A curious mind. A relentless builder.
            <br className="desktop-break" /> Step inside. Ask a question. Get to
            know me.
          </p>
          <div className="suggestions" aria-label="Suggested questions">
            {suggestedQuestions.map((item) => (
              <button
                key={item.code}
                className="suggestion"
                disabled={inputActive}
                onClick={() => onQuestion(item.question)}
              >
                <span className="suggestion-code">{item.code}</span>
                <span>{item.label}</span>
                <Icon name="arrow" size={14} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="conversation-heading">
            <span>OPEN CONVERSATION</span>
            <span>
              {String(
                messages.filter((message) => message.role === "visitor").length,
              ).padStart(2, "0")}{" "}
              QUERIES
            </span>
          </div>
          <div
            className="conversation-scroll"
            ref={scrollRef}
            tabIndex={0}
            aria-label="Conversation history"
            onScroll={(event) => {
              const node = event.currentTarget;
              followRef.current =
                node.scrollHeight - node.scrollTop - node.clientHeight < 65;
            }}
          >
            {messages.map((message) => (
              <article
                key={message.id}
                data-message-id={message.id}
                className={`message message-${message.role}`}
              >
                <div className="message-meta">
                  <span>{message.role === "visitor" ? "YOU" : "SHAAZ"}</span>
                </div>
                <p>
                  {message.content}
                  {message.id === messages.at(-1)?.id &&
                    phase === "responding" && (
                      <span className="blinking-cursor">▌</span>
                    )}
                </p>
                {message.complete && message.projects?.length > 0 && (
                  <div
                    className={
                      message.projects.length > 1
                        ? "project-collection"
                        : "project-results"
                    }
                    aria-label="Project results"
                  >
                    {message.projects.map((project) => (
                      <ProjectShowcase key={project.id} project={project} />
                    ))}
                  </div>
                )}
                {message.complete && message.links?.length > 0 && (
                  <div className="response-links">
                    {message.links.map((link) => (
                      <a
                        key={`${link.href}-${link.label}`}
                        href={link.href}
                        target={link.download ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        download={link.download}
                      >
                        {link.label} <Icon name="arrow" size={14} />
                      </a>
                    ))}
                  </div>
                )}
                {message.role === "shaaz" && message.complete && (
                  <button
                    type="button"
                    className="play-response"
                    onClick={() =>
                      speech.activeId === message.id
                        ? speech.stop()
                        : onPlay(message)
                    }
                    disabled={!speech.supported || inputActive}
                    title={
                      speech.supported
                        ? undefined
                        : "Voice playback is unavailable in this browser"
                    }
                    aria-label={
                      speech.activeId === message.id
                        ? "Stop speaking"
                        : `Play response ${message.sequence}`
                    }
                  >
                    <Icon
                      name={speech.activeId === message.id ? "stop" : "play"}
                      size={14}
                    />
                    {speech.activeId === message.id
                      ? speech.status === "starting"
                        ? "Starting… · Stop"
                        : "Stop speaking"
                      : speech.supported
                        ? "Listen to response"
                        : "Voice unavailable"}
                  </button>
                )}
              </article>
            ))}
            {phase === "thinking" && (
              <div className="processing">
                <span className="processing-dot" /> PROCESSING QUERY
                <span className="processing-ellipsis">...</span>
                <small>ACCESSING LOCAL ARCHIVE</small>
              </div>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="conversation-hint">
            {phase === "idle"
              ? "YOUR NEXT QUESTION IS WELCOME."
              : phase === "thinking"
                ? "A MOMENT. CONNECTING THE DOTS."
                : "TRANSMITTING RESPONSE…"}
            <span className="blinking-cursor">_</span>
          </div>
        </>
      )}
      <QuestionDirectory
        onQuestion={onQuestion}
        disabled={inputActive || phase !== "idle"}
      />
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </section>
  );
}
