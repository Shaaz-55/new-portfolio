import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import AvatarFallback from "./AvatarFallback.jsx";
import { createPlaceholderModel, loadAvatarModel } from "./avatarModel.js";
import { createAvatarAnimation } from "./avatarAnimation.js";
import Waveform from "../voice/Waveform.jsx";

export default function DigitalAvatar({
  state,
  reducedMotion,
  recording = false,
  modelLoader = loadAvatarModel,
  animationFactory = createAvatarAnimation,
  configUrl = "/models/avatar-config.json",
}) {
  const containerRef = useRef(null);
  const stateRef = useRef(state);
  const reducedRef = useRef(reducedMotion);
  const [rendererState, setRendererState] = useState("loading");
  const [custom, setCustom] = useState(false);
  stateRef.current = state;
  reducedRef.current = reducedMotion;
  useEffect(() => {
    const container = containerRef.current;
    const abort = new AbortController();
    let renderer, frame, observer, scene, model, animation;
    let disposed = false,
      contextLost = false,
      lastFrame = 0,
      lastState = "";
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
    camera.position.set(0, 1.95, 7.1);
    camera.lookAt(0, 1.85, 0);
    const draw = (time) => {
      if (disposed || document.hidden || contextLost) return;
      if (
        time - lastFrame > (reducedRef.current ? 250 : 32) ||
        lastState !== stateRef.current
      ) {
        animation?.update(time / 1000, stateRef.current, reducedRef.current);
        renderer.render(scene, camera);
        lastFrame = time;
        lastState = stateRef.current;
      }
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !disposed && !contextLost)
        frame = requestAnimationFrame(draw);
    };
    const lost = (event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      setRendererState("fallback");
    };
    const restored = () => {
      if (disposed) return;
      contextLost = false;
      setRendererState("ready");
      visibility();
    };
    const cleanup = () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      animation?.dispose();
      model?.dispose();
      renderer?.domElement.removeEventListener("webglcontextlost", lost);
      renderer?.domElement.removeEventListener(
        "webglcontextrestored",
        restored,
      );
      renderer?.dispose();
      renderer?.domElement.remove();
    };
    setCustom(false);
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
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      canvas.setAttribute(
        "aria-label",
        "Temporary stylised male 3D character, not a likeness of Shaaz",
      );
      canvas.setAttribute("role", "img");
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("webglcontextrestored", restored);
      container.appendChild(canvas);
      scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight("#c5d9bc", "#14251c", 1.1));
      const key = new THREE.DirectionalLight("#e4e4cf", 3.1);
      key.position.set(-3, 5, 4);
      const rim = new THREE.DirectionalLight("#8ccaa0", 2.8);
      rim.position.set(3, 2, -2);
      const fill = new THREE.DirectionalLight("#6d8f7b", 0.65);
      fill.position.set(3, 1, 4);
      scene.add(key, rim, fill);
      model = createPlaceholderModel();
      animation = animationFactory(model);
      scene.add(model.root);
      const resize = () => {
        if (disposed) return;
        const { width, height } = container.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize);
      observer.observe(container);
      resize();
      document.addEventListener("visibilitychange", visibility);
      frame = requestAnimationFrame(draw);
      setRendererState("ready");
      (async () => {
        try {
          const response = await fetch(configUrl, { signal: abort.signal });
          if (!response.ok) return;
          const config = await response.json();
          if (!config.modelUrl || disposed) return;
          const next = await modelLoader(config, { signal: abort.signal });
          if (disposed) {
            next.dispose();
            return;
          }
          let nextAnimation;
          try {
            nextAnimation = animationFactory(next);
          } catch (error) {
            next.dispose();
            throw error;
          }
          scene.remove(model.root);
          animation.dispose();
          model.dispose();
          model = next;
          animation = nextAnimation;
          scene.add(model.root);
          if (
            Array.isArray(config.cameraPosition) &&
            config.cameraPosition.length === 3
          )
            camera.position.fromArray(config.cameraPosition);
          if (
            Array.isArray(config.cameraTarget) &&
            config.cameraTarget.length === 3
          )
            camera.lookAt(new THREE.Vector3().fromArray(config.cameraTarget));
          setCustom(model.kind === "custom");
          canvas.setAttribute(
            "aria-label",
            model.kind === "custom"
              ? "Custom 3D avatar"
              : "Temporary stylised male 3D character, not a likeness of Shaaz",
          );
        } catch {
          /* A missing or invalid GLB keeps the fully functional stand-in. */
        }
      })();
    } catch {
      cleanup();
      setRendererState("fallback");
    }
    return cleanup;
  }, [modelLoader, animationFactory, configUrl]);
  return (
    <section
      className={`avatar-region avatar-${state}`}
      data-avatar-state={state}
      aria-label="Digital avatar"
    >
      <div
        ref={containerRef}
        className={`avatar-canvas ${rendererState === "fallback" ? "is-unavailable" : ""}`}
        data-renderer={rendererState}
      />
      {rendererState !== "ready" && <AvatarFallback />}
      <div className="avatar-shade" />
      <div className="avatar-name">
        <h2>Shaaz Hemani</h2>
      </div>
      <div className="avatar-state">
        <span>
          <i className="led" />
          {state === "idle" ? "READY TO CONNECT" : state.toUpperCase()}
        </span>
        <Waveform active={state === "speaking" || recording} />
      </div>
      {custom ? (
        <span className="avatar-disclosure">CUSTOM AVATAR</span>
      ) : (
        <a
          className="avatar-disclosure"
          href="/models/ATTRIBUTION.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          ILLUSTRATIVE AVATAR · CREDITS ↗
        </a>
      )}
    </section>
  );
}
