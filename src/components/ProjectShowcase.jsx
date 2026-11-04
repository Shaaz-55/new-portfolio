import { useRef, useState } from "react";
import "../styles/projectShowcase.css";

function Screenshot({ image, className }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      className={`project-image-fallback ${className || ""}`}
      role="img"
      aria-label={`${image.alt} — unavailable`}
    >
      {image.label} preview unavailable
    </span>
  ) : (
    <img
      className={className}
      src={image.src}
      alt={image.alt}
      onError={() => setFailed(true)}
    />
  );
}

export default function ProjectShowcase({ project }) {
  const images = project.images || [];
  const [selected, setSelected] = useState(
    project.selectedImage || images[0]?.id,
  );
  const dialog = useRef(null);
  const image = images.find((item) => item.id === selected) || images[0];
  if (!image) return null;
  return (
    <section
      className="project-showcase"
      aria-label={`${project.name} project showcase`}
    >
      <h3>{project.name}</h3>
      <p className="project-description">{project.description}</p>
      <button
        type="button"
        className="project-preview"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Enlarge ${project.name} ${image.label} screenshot`}
      >
        <Screenshot key={image.src} image={image} />
        <span>{image.label} · Enlarge</span>
      </button>
      <div
        className="project-thumbnails"
        role="group"
        aria-label={`${project.name} screenshots`}
      >
        {images.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            aria-pressed={image.id === item.id}
            aria-label={`Show ${project.name} ${item.label} screenshot`}
          >
            <Screenshot image={item} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <ul className="project-technologies" aria-label="Technology stack">
        {project.technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
      <div className="response-links project-links">
        {project.liveDemoUrl && (
          <a
            href={project.liveDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Live Demo ↗
          </a>
        )}
        {project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
        )}
      </div>
      <dialog
        ref={dialog}
        className="project-lightbox"
        aria-label={`${project.name} ${image.label} enlarged screenshot`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current.close();
        }}
      >
        <div className="project-lightbox-bar">
          <span>
            {project.name} · {image.label}
          </span>
          <button
            type="button"
            onClick={() => dialog.current.close()}
            autoFocus
          >
            Close preview
          </button>
        </div>
        <Screenshot key={image.src} image={image} />
      </dialog>
    </section>
  );
}
