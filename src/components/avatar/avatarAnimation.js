import * as THREE from "three";
import { createPlaceholderAnimation } from "./placeholderAnimation.js";

// Replace this factory independently of the model loader and stage.
export function createAvatarAnimation(model) {
  if (model.kind === "placeholder") return createPlaceholderAnimation(model);
  const { root, config = {}, clips = [] } = model;
  const faces = [],
    heads = [];
  root.traverse((node) => {
    if (node.morphTargetDictionary && node.morphTargetInfluences)
      faces.push(node);
    if (node.isBone && /^(head|mixamorighead)$/i.test(node.name))
      heads.push({ node, rotation: node.rotation.clone() });
  });
  const mixer = new THREE.AnimationMixer(root);
  let previousTime, currentAction, currentState;
  const actions = {};
  for (const state of ["idle", "listening", "thinking", "speaking"]) {
    const name = config.animations?.[state] || state;
    const clip = clips.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );
    if (clip) actions[state] = mixer.clipAction(clip);
  }
  return {
    update(time, state, reduced) {
      const delta =
        previousTime === undefined ? 0 : Math.min(time - previousTime, 0.1);
      previousTime = time;
      const action = actions[state] || actions.idle;
      if (action !== currentAction) {
        if (currentState === "speaking") currentAction?.stop();
        else currentAction?.fadeOut(0.3);
        action?.reset().fadeIn(0.3).play();
        currentAction = action;
      }
      if (!reduced) mixer.update(delta);
      root.rotation.z = THREE.MathUtils.lerp(
        root.rotation.z,
        reduced ? 0 : Math.sin(time * 0.4) * 0.007,
        0.12,
      );
      if (!currentAction)
        heads.forEach(({ node, rotation }) => {
          node.rotation.y = THREE.MathUtils.lerp(
            node.rotation.y,
            rotation.y +
              (reduced
                ? 0
                : state === "thinking"
                  ? -0.07
                  : Math.sin(time * 0.31) * 0.018),
            0.1,
          );
          node.rotation.z = THREE.MathUtils.lerp(
            node.rotation.z,
            rotation.z + (reduced ? 0 : state === "listening" ? -0.025 : 0),
            0.1,
          );
        });
      faces.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const mouth = dict[config.morphs?.mouth || "jawOpen"] ?? dict.mouthOpen;
        // Speech ends close the mouth immediately, even if a clip fades out.
        if (mouth !== undefined)
          mesh.morphTargetInfluences[mouth] =
            state === "speaking" && !reduced
              ? 0.1 + Math.abs(Math.sin(time * 10)) * 0.16
              : 0;
        for (const name of ["eyeBlinkLeft", "eyeBlinkRight"]) {
          const index = dict[name];
          if (index !== undefined)
            mesh.morphTargetInfluences[index] =
              !reduced && time % 4.9 > 4.7
                ? Math.sin((((time % 4.9) - 4.7) / 0.2) * Math.PI)
                : 0;
        }
      });
      currentState = state;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
