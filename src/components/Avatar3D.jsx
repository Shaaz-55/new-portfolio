import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import AvatarFallback from "./avatar/AvatarFallback.jsx";
import { createProceduralAvatar } from "./avatar/AvatarGeometry.js";
import { createProceduralAnimation } from "./avatar/proceduralAnimation.js";
import Waveform from "./voice/Waveform.jsx";

// A future custom model can still use the existing loader/animation contracts.
async function loadCustomModel(config, options) {
  const { loadAvatarModel } = await import("./avatar/avatarModel.js");
  return loadAvatarModel(config, options);
}
async function customAnimation(model) {
  const { createAvatarAnimation } = await import("./avatar/avatarAnimation.js");
  return createAvatarAnimation(model);
}

export default function Avatar3D({
  state = "idle", reducedMotion = false, recording = false,
  modelLoader = loadCustomModel, configUrl = "/models/avatar-config.json",
}) {
  const containerRef = useRef(null);
  const stateRef = useRef(state), reducedRef = useRef(reducedMotion);
  const [rendererState, setRendererState] = useState("loading");
  const [kind, setKind] = useState("procedural");
  stateRef.current = state; reducedRef.current = reducedMotion;

  useEffect(() => {
    const container = containerRef.current, abort = new AbortController();
    let renderer, frame, resizeObserver, intersectionObserver, scene, model, animation;
    let disposed = false, contextLost = false, visible = true, lastFrame = 0, lastState = "";
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
    camera.position.set(0, 2.16, 6.8);
    camera.lookAt(0, 2.06, 0);
    const draw = (time) => {
      if (disposed || document.hidden || contextLost || !visible) return;
      if (time-lastFrame > (reducedRef.current ? 250 : 33) || lastState !== stateRef.current) {
        try {
          animation?.update(time/1000, stateRef.current, reducedRef.current);
          renderer.render(scene,camera);
        } catch {
          contextLost = true;
          setRendererState("fallback");
          return;
        }
        lastFrame=time; lastState=stateRef.current;
      }
      frame=requestAnimationFrame(draw);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      if (!disposed && !document.hidden && !contextLost && visible) frame=requestAnimationFrame(draw);
    };
    const lost = event => {
      event.preventDefault(); contextLost=true;
      cancelAnimationFrame(frame); setRendererState("fallback");
    };
    const restored = () => {
      if (disposed) return;
      contextLost=false; setRendererState("ready"); resume();
    };
    const cleanup = () => {
      disposed=true; abort.abort(); cancelAnimationFrame(frame);
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange",resume);
      animation?.dispose(); model?.dispose();
      renderer?.domElement.removeEventListener("webglcontextlost",lost);
      renderer?.domElement.removeEventListener("webglcontextrestored",restored);
      renderer?.dispose(); renderer?.domElement.remove();
    };
    setRendererState("loading"); setKind("procedural");
    try {
      const canvas=document.createElement("canvas");
      const context=canvas.getContext("webgl2",{alpha:true,antialias:true,powerPreference:"low-power"});
      if (!context) {setRendererState("fallback");return cleanup;}
      renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.12;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      canvas.setAttribute("role","img");
      canvas.setAttribute("aria-label","Front-facing 3D portrait study of Shaaz, with swept hair, round glasses, a beard, pale shirt and dark tie");
      canvas.dataset.model="procedural";
      canvas.addEventListener("webglcontextlost",lost);
      canvas.addEventListener("webglcontextrestored",restored);
      container.appendChild(canvas);
      scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight("#e8dfd3","#606353",1.75));
      const key=new THREE.DirectionalLight("#fff0e1",2.2);
      key.position.set(-3,5,5);key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);
      Object.assign(key.shadow.camera,{left:-2,right:2,top:4,bottom:-1,near:0.5,far:14});
      key.shadow.normalBias=0.026; key.shadow.bias=-0.0002; key.shadow.radius=3;
      const fill=new THREE.DirectionalLight("#e4e2da",1.8);fill.position.set(3,2.8,4);
      const rim=new THREE.DirectionalLight("#9ec5a7",1.6);rim.position.set(2,4,-3);
      scene.add(key,fill,rim);
      model=createProceduralAvatar();animation=createProceduralAnimation(model);scene.add(model.root);
      const resize = () => {
        if(disposed)return;
        const {width,height}=container.getBoundingClientRect();
        if(!width||!height)return;
        renderer.setSize(width,height);
        camera.aspect=width/height;camera.updateProjectionMatrix();
      };
      resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
      intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();});
      intersectionObserver.observe(container);
      document.addEventListener("visibilitychange",resume);resume();
      setRendererState("ready");
      (async () => {
        let next;
        try {
          const response=await fetch(configUrl,{signal:abort.signal});
          if(!response.ok)return;
          const config=await response.json();
          if(config.kind!=="custom"||!config.modelUrl||disposed)return;
          next=await modelLoader(config,{signal:abort.signal});
          if(disposed){next.dispose();return;}
          const nextAnimation=await customAnimation(next);
          if(disposed){nextAnimation.dispose();next.dispose();return;}
          scene.remove(model.root);animation.dispose();model.dispose();
          model=next;next=null;animation=nextAnimation;scene.add(model.root);
          if(Array.isArray(config.cameraPosition)&&config.cameraPosition.length===3) camera.position.fromArray(config.cameraPosition);
          if(Array.isArray(config.cameraTarget)&&config.cameraTarget.length===3) camera.lookAt(new THREE.Vector3().fromArray(config.cameraTarget));
          canvas.dataset.model="custom";canvas.setAttribute("aria-label","Custom 3D avatar");
          setKind("custom");
        } catch {next?.dispose(); /* Invalid optional models keep the reference study. */}
      })();
    } catch {cleanup();setRendererState("fallback");}
    return cleanup;
  },[modelLoader,configUrl]);

  return (
    <section className={`avatar-region avatar-${state}`} data-avatar-state={state} aria-label="Digital avatar">
      <div ref={containerRef} className={`avatar-canvas ${rendererState==="fallback"?"is-unavailable":""}`} data-renderer={rendererState} />
      {rendererState!=="ready"&&<AvatarFallback />}
      {rendererState==="loading"&&<span className="avatar-loading" role="status">Loading portrait…</span>}
      <div className="avatar-shade" />
      <div className="avatar-name"><h2>Shaaz Hemani</h2></div>
      <div className="avatar-state"><span><i className="led" />{state==="idle"?"READY TO CONNECT":state.toUpperCase()}</span><Waveform active={state==="speaking"||recording}/></div>
      <span className="avatar-disclosure">{rendererState==="fallback"?"PORTRAIT · 3D UNAVAILABLE":kind==="custom"?"CUSTOM AVATAR":"PORTRAIT STUDY"}</span>
    </section>
  );
}
