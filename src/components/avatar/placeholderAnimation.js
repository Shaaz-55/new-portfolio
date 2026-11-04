import * as THREE from "three";

export function createPlaceholderAnimation({ rig }) {
  return {
    update(time, state, reducedMotion) {
      const {
        headPivot,
        torso,
        eyeGroups,
        mouthOpening,
        lowerLip,
        referenceGeometry,
        referencePositions,
        referenceOriginal,
        mouthWeights,
      } = rig;
      const active = !reducedMotion;
      const thinking = state === "thinking";
      const listening = state === "listening";
      const speaking = state === "speaking";
      const targetZ = thinking
        ? 0.06
        : listening
          ? -0.025
          : active
            ? Math.sin(time * 0.43) * 0.009
            : 0;
      headPivot.rotation.z = THREE.MathUtils.lerp(
        headPivot.rotation.z,
        targetZ,
        0.05,
      );
      headPivot.rotation.y = THREE.MathUtils.lerp(
        headPivot.rotation.y,
        thinking ? -0.07 : active ? Math.sin(time * 0.31) * 0.018 : 0,
        0.05,
      );
      headPivot.rotation.x = THREE.MathUtils.lerp(
        headPivot.rotation.x,
        listening ? 0.025 : active ? Math.sin(time * 0.7) * 0.008 : 0,
        0.05,
      );
      torso.scale.y = 0.99 + (active ? Math.sin(time * 1.4) * 0.005 : 0);
      const blinkTime = time % 4.9;
      const blink =
        active && blinkTime > 4.69
          ? Math.max(0.08, Math.abs(blinkTime - 4.795) / 0.105)
          : 1;
      eyeGroups.forEach((eye) => {
        eye.scale.y = blink;
      });
      const mouthAmount =
        speaking && active
          ? 0.6 + Math.sin(time * 19) * 0.35 + Math.sin(time * 11) * 0.15
          : 0;
      mouthOpening.scale.y = 0.008 + mouthAmount * 0.03;
      if (referenceGeometry) mouthOpening.visible = speaking;
      lowerLip.position.y = -mouthAmount * 0.028;
      if (referencePositions) {
        for (let i = 0; i < referencePositions.count; i++)
          if (mouthWeights[i] > 0.005)
            referencePositions.setY(
              i,
              referenceOriginal[i * 3 + 1] -
                mouthAmount * 0.022 * mouthWeights[i],
            );
        referencePositions.needsUpdate = true;
      }
    },
    dispose() {},
  };
}
