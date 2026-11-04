import { MathUtils } from "three";

export function createProceduralAnimation({ rig }) {
  let previousTime;
  return {
    // speakingAmount can be supplied by a future audio analyser. The current
    // gentle mouth motion follows playback state, not phonemes or lip sync.
    update(time,state,reducedMotion,speakingAmount) {
      const delta=previousTime===undefined?1/30:Math.min(0.1,time-previousTime);
      previousTime=time;
      const blend=1-Math.exp(-delta*5), active=!reducedMotion;
      const thinking=state==="thinking", listening=state==="listening";
      rig.headPivot.rotation.y=MathUtils.lerp(rig.headPivot.rotation.y,active?(thinking?-0.055:Math.sin(time*0.31)*0.016):0,blend);
      rig.headPivot.rotation.z=MathUtils.lerp(rig.headPivot.rotation.z,active?(listening?-0.016:Math.sin(time*0.43)*0.009):0,blend);
      rig.headPivot.rotation.x=MathUtils.lerp(rig.headPivot.rotation.x,active?Math.sin(time*0.62)*0.008:0,blend);
      rig.body.scale.y=1+(active?Math.sin(time*1.25)*0.003:0);
      const cycle=time%5.3;
      const blink=active&&cycle>5.07?Math.max(0.04,Math.abs(cycle-5.185)/0.115):1;
      rig.eyes.forEach(eye=>{eye.scale.y=blink;});
      const amount=state==="speaking"&&active?(speakingAmount??(0.25+Math.abs(Math.sin(time*8.2)*Math.sin(time*13.7))*0.65)):0;
      rig.opening.scale.y=0.012+amount*0.027;
      rig.lowerLip.position.y=-amount*0.032;
      rig.teeth.position.y=0.005-amount*0.006;
    },
    dispose() {},
  };
}
