import { useId, useRef, useState } from "react";
import { interviewCategories } from "../../data/interviewQuestions.js";
import Icon from "../Icon.jsx";

export default function QuestionDirectory({ onQuestion, disabled }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [categoryId, setCategoryId] = useState(interviewCategories[0].id);
  const category = interviewCategories.find((item) => item.id === categoryId);

  return (
    <>
      <button
        type="button"
        className="interview-trigger"
        onClick={() => dialog.current?.showModal()}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        Browse interview questions <Icon name="arrow" size={13} />
      </button>
      <dialog
        ref={dialog}
        className="question-directory"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current.close();
        }}
      >
        <div className="question-directory-heading">
          <h2 id={titleId}>Interview archive</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => dialog.current.close()}
            autoFocus
          >
            <Icon name="close" size={14} /> Close
          </button>
        </div>
        <p>Choose a question to explore my background, work, and approach.</p>
        <div
          className="question-categories"
          role="group"
          aria-label="Question categories"
        >
          {interviewCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === categoryId}
              onClick={() => setCategoryId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ul
          className="interview-question-list"
          aria-label={`${category.label} questions`}
          key={category.id}
        >
          {category.questions.map((question) => (
            <li key={question}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  dialog.current.close();
                  onQuestion(question);
                }}
              >
                <span>{question}</span>
                <Icon name="arrow" size={14} />
              </button>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
