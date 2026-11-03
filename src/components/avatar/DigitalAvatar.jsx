import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildAvatar } from "./buildAvatar.js";

function disposeObject(object) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    if (child.material)
      (Array.isArray(child.material)
        ? child.material
        : [child.material]
      ).forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value?.isTexture) textures.add(value);
        });
      });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

function AvatarFallback() {
  return (
    <svg
      className="avatar-fallback"
      viewBox="0 0 300 370"
      role="img"
      aria-label="Illustrative portrait of a young builder"
    >
      <defs>
        <linearGradient id="portrait-face" x1="0" x2="1">
          <stop stopColor="#a3b19a" />
          <stop offset=".55" stopColor="#657e65" />
          <stop offset="1" stopColor="#263b30" />
        </linearGradient>
        <linearGradient id="portrait-jacket" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#324a3e" />
          <stop offset="1" stopColor="#0c1813" />
        </linearGradient>
      </defs>
      <path
        d="M33 370 45 274Q50 248 108 229L121 211h57l17 20q55 15 65 43l14 96"
        fill="url(#portrait-jacket)"
      />
      <path d="m127 194-6 46 29 24 29-27-9-43" fill="url(#portrait-face)" />
      <path
        d="M98 106q-3-63 50-62t58 64l-9 72-27 31-34 1-31-34z"
        fill="url(#portrait-face)"
      />
      <path
        d="m96 137-7-43q-5-52 61-57 68-3 58 65l-7 32-9-49q-28 10-52-6l-32 24-4 35"
        fill="#17221b"
      />
      <path d="m109 126 23-4m35 0 23 4" stroke="#223428" strokeWidth="5" />
      <path d="m114 133 16-1m39 0 16 2" stroke="#adc3a5" strokeWidth="3" />
      <path
        d="m148 129-7 33 14 2m-20 18q16 7 30-1"
        fill="none"
        stroke="#405240"
        strokeWidth="3"
      />
      <path
        d="m119 231-22 13 22 55 30-34-28-25m59-8 24 14-20 54-31-35 28-25"
        fill="#3b5042"
      />
      <path d="M150 268v102" stroke="#69806a" />
    </svg>
  );
}

export default function DigitalAvatar({ state, reducedMotion }) {
  const containerRef = useRef(null);
  const stateRef = useRef(state);
  const reducedRef = useRef(reducedMotion);
  const [rendererState, setRendererState] = useState("loading");
  const [custom, setCustom] = useState(false);
  stateRef.current = state;
  reducedRef.current = reducedMotion;
  useEffect(() => {
    const container = containerRef.current;
    let renderer,
      frame,
      observer,
      disposed = false,
      avatar,
      scene;
    const abort = new AbortController();
    let lastFrame = 0,
      lastState = "";
    const cleanup = () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      if (scene) disposeObject(scene);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !disposed) frame = requestAnimationFrame(draw);
    };
    const draw = (time) => {
      if (disposed || document.hidden) return;
      const changed = lastState !== stateRef.current;
      if (time - lastFrame > (reducedRef.current ? 250 : 32) || changed) {
        avatar?.update(time / 1000, stateRef.current, reducedRef.current);
        renderer.render(scene, camera);
        lastFrame = time;
        lastState = stateRef.current;
      }
      frame = requestAnimationFrame(draw);
    };
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
    camera.position.set(0, 2.05, 6.15);
    camera.lookAt(0, 1.95, 0);
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2", {
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      if (!context) {
        setRendererState("fallback");
        return cleanup;
      }
      renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.domElement.setAttribute(
        "aria-label",
        "Illustrative 3D avatar of a young builder, not a likeness of Shaaz",
      );
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        cancelAnimationFrame(frame);
        setRendererState("fallback");
      });
      renderer.domElement.addEventListener("webglcontextrestored", () => {
        if (!disposed) {
          setRendererState("ready");
          visibility();
        }
      });
      container.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight("#c5d9bc", "#14251c", 1.1));
      const key = new THREE.DirectionalLight("#e4e4cf", 3.1);
      key.position.set(-3, 5, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight("#8ccaa0", 2.8);
      rim.position.set(3, 2, -2);
      scene.add(rim);
      const fill = new THREE.DirectionalLight("#6d8f7b", 0.65);
      fill.position.set(3, 1, 4);
      scene.add(fill);
      avatar = buildAvatar();
      scene.add(avatar.root);
      new GLTFLoader().load(
        "/models/portrait-study.glb",
        (gltf) => {
          if (disposed) {
            disposeObject(gltf.scene);
            return;
          }
          const mesh = gltf.scene.getObjectByProperty("isMesh", true);
          if (mesh && avatar.setPortraitGeometry)
            avatar.setPortraitGeometry(mesh.geometry.clone());
          disposeObject(gltf.scene);
        },
        undefined,
        () => {},
      );
      observer = new ResizeObserver(() => {
        if (disposed) return;
        const { width, height } = container.getBoundingClientRect();
        if (width && height) {
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      });
      observer.observe(container);
      document.addEventListener("visibilitychange", visibility);
      frame = requestAnimationFrame(draw);
      setRendererState("ready");
      // A config file avoids requesting a missing GLB on every page load.
      fetch("/models/avatar-config.json", { signal: abort.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((config) => {
          if (!config?.modelUrl || disposed) return;
          new GLTFLoader().load(
            config.modelUrl,
            (gltf) => {
              if (disposed) {
                disposeObject(gltf.scene);
                return;
              }
              const box = new THREE.Box3().setFromObject(gltf.scene),
                size = box.getSize(new THREE.Vector3()),
                center = box.getCenter(new THREE.Vector3());
              if (!Number.isFinite(size.y) || size.y <= 0) {
                disposeObject(gltf.scene);
                return;
              }
              const model = new THREE.Group();
              gltf.scene.position.sub(center);
              model.add(gltf.scene);
              model.scale.setScalar(3.4 / size.y);
              model.position.y = 1.7;
              scene.remove(avatar.root);
              disposeObject(avatar.root);
              scene.add(model);
              const faceMeshes = [];
              model.traverse((child) => {
                if (child.morphTargetDictionary && child.morphTargetInfluences)
                  faceMeshes.push(child);
              });
              avatar = {
                root: model,
                update(time, status, reduced) {
                  model.rotation.z = reduced ? 0 : Math.sin(time * 0.4) * 0.007;
                  faceMeshes.forEach((mesh) => {
                    const dict = mesh.morphTargetDictionary;
                    const mouth = dict.jawOpen ?? dict.mouthOpen;
                    if (mouth !== undefined)
                      mesh.morphTargetInfluences[mouth] =
                        status === "speaking" && !reduced
                          ? 0.12 + Math.abs(Math.sin(time * 10)) * 0.15
                          : 0;
                  });
                },
              };
              setCustom(true);
            },
            undefined,
            () => {
              /* Keep the working procedural model when a custom asset fails. */
            },
          );
        })
        .catch(() => {
          /* The built-in bust is already ready. */
        });
    } catch {
      cleanup();
      setRendererState("fallback");
    }
    return cleanup;
  }, []);
  return (
    <div className={`avatar-region avatar-${state}`} data-avatar-state={state}>
      <div className="avatar-coordinate top-left">
        SH—001
        <br />
        <span>PERSONAL LINK</span>
      </div>
      <div className="avatar-reticle" aria-hidden="true" />
      <div
        ref={containerRef}
        className={`avatar-canvas ${rendererState === "fallback" ? "is-unavailable" : ""}`}
        data-renderer={rendererState}
      />
      {rendererState !== "ready" && <AvatarFallback />}
      <div className="avatar-shade" />
      <div className="avatar-name">
        <span className="micro-label">THE HUMAN BEHIND THE IDEAS</span>
        <h2>
          Shaaz Hemani<span>+</span>
        </h2>
        <p>STUDENT. BUILDER. ALWAYS CURIOUS.</p>
      </div>
      <div className="avatar-state">
        <span>
          <i className="led" />
          {state === "idle" ? "READY TO CONNECT" : state.toUpperCase()}
        </span>
        <span className="voice-bars" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <i key={i} style={{ animationDelay: `${i * -0.13}s` }} />
          ))}
        </span>
      </div>
      {custom ? (
        <span className="avatar-disclosure">CUSTOM AVATAR</span>
      ) : (
        <a
          className="avatar-disclosure"
          href="/models/ATTRIBUTION.md"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Illustrative avatar, not a likeness of Shaaz. Open avatar source credits."
        >
          ILLUSTRATIVE AVATAR · NOT A LIKENESS ↗
        </a>
      )}
    </div>
  );
}
