import * as THREE from "three";
import { createAvatarMaterials } from "./AvatarMaterials.js";

// Hand-shaped from the supplied four-second Tripo turntable. All surfaces below
// are generated locally: no imported head, portrait texture, or model download.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const gaussian = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
const faceProfile = [
  [1.94, 0.04, 0.13], [1.99, 0.19, 0.23], [2.1, 0.31, 0.285],
  [2.27, 0.389, 0.325], [2.48, 0.442, 0.36], [2.7, 0.446, 0.355],
  [2.91, 0.435, 0.357], [3.1, 0.39, 0.335], [3.24, 0.26, 0.255], [3.31, 0.005, 0.005],
];

// Cubic interpolation keeps the jaw, temples and shoulders continuous in profile.
function profileAt(profile, y) {
  let i = 0;
  while (i < profile.length - 2 && y > profile[i + 1][0]) i++;
  const a = profile[i], b = profile[i + 1];
  const prev = profile[Math.max(0, i - 1)], next = profile[Math.min(profile.length - 1, i + 2)];
  const span = b[0] - a[0], t = clamp((y - a[0]) / span, 0, 1);
  return [1, 2].map(axis => {
    const ma = (b[axis] - prev[axis]) / (b[0] - prev[0]);
    const mb = (next[axis] - a[axis]) / (next[0] - a[0]);
    return Math.max(0.001, (2*t**3 - 3*t**2 + 1)*a[axis] + (t**3 - 2*t**2 + t)*span*ma + (-2*t**3 + 3*t**2)*b[axis] + (t**3 - t**2)*span*mb);
  });
}

function faceDepth(x, y, front = 1) {
  const [rx, rz] = profileAt(faceProfile, y);
  const cos = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  // One continuous surface carries the nose bridge, tip, alae, cheekbones,
  // eye sockets, muzzle and chin. The nose is not an attached cone or sphere.
  const detail =
    0.145 * gaussian(x,y,0,2.68,0.057,0.19) +
    0.223 * gaussian(x,y,0,2.506,0.08,0.08) +
    0.065 * (gaussian(x,y,-0.075,2.485,0.035,0.035) + gaussian(x,y,0.075,2.485,0.035,0.035)) +
    0.043 * gaussian(x,y,0,2.325,0.19,0.13) +
    0.04 * gaussian(x,y,0,2.056,0.19,0.085) +
    0.042 * (gaussian(x,y,-0.265,2.53,0.15,0.12) + gaussian(x,y,0.265,2.53,0.15,0.12)) -
    0.035 * (gaussian(x,y,-0.211,2.735,0.108,0.068) + gaussian(x,y,0.211,2.735,0.108,0.068));
  return rz * cos + detail * front;
}

function beardDensity(x, y) {
  const cheekLine = 2.255 + 0.43 * clamp(Math.abs(x) / 0.445, 0, 1);
  let density = clamp((cheekLine - y) / 0.055, 0, 1);
  density *= 1 - 0.98 * gaussian(x,y,0,2.285,0.155,0.102);
  density = Math.max(density, 0.85 * gaussian(x,y,0,2.185,0.048,0.041));
  return density;
}

function surface(rows, columns, sample, colour) {
  const positions = [], indices = [], colors = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const u = col / columns, v = row / rows;
      const p = sample(u, v);
      positions.push(...p);
      if (colour) colors.push(...colour(p, u, v));
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col, b = a + columns + 1;
        indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (colour) geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addMesh(parent, geometry, material, name) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name || "";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function oval(parent, material, position, scale, segments = 28) {
  const mesh = addMesh(parent, new THREE.SphereGeometry(1, segments, 20), material);
  mesh.position.set(...position); mesh.scale.set(...scale);
  return mesh;
}
function stroke(parent, points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
  return addMesh(parent, new THREE.TubeGeometry(curve, closed ? 64 : 28, radius, 6, closed), material);
}
function clothPanel(parent, points, material, depth = 0.035) {
  const outline = new THREE.Shape();
  points.forEach(([x,y], i) => i ? outline.lineTo(x,y) : outline.moveTo(x,y));
  outline.closePath();
  const mesh = addMesh(parent, new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled:true, bevelSize:0.014, bevelThickness:0.012, bevelSegments:3, steps:1 }), material);
  mesh.position.z = 0.31;
  return mesh;
}

function hairPoint(theta, v, lift = 0) {
  const front = Math.max(0, Math.cos(theta));
  const hairline = 2.555 + 0.50 * front ** 0.42 + 0.135 * Math.abs(Math.sin(theta)) + 0.023 * Math.sin(theta * 2.2);
  const radial = Math.cos(v * Math.PI / 2);
  const wave = 0.012 * Math.sin(theta * 14 + v * 7) * Math.sin(v * Math.PI);
  return [
    (0.473 + wave + lift) * Math.sin(theta) * radial - 0.055 * Math.sin(v * Math.PI / 2),
    hairline + (3.49 - hairline) * Math.sin(v * Math.PI / 2) + 0.065 * Math.sin(v * Math.PI) * front * (0.8 - Math.sin(theta) * 0.4) + lift,
    (0.404 + wave + lift) * Math.cos(theta) * radial - 0.042,
  ];
}

export function createProceduralAvatar() {
  const root = new THREE.Group(); root.name = "ShaazProceduralPortrait";
  const materials = createAvatarMaterials();
  const body = new THREE.Group(); body.position.y = 0.18; root.add(body);
  const headPivot = new THREE.Group(); headPivot.position.y = 1.89; root.add(headPivot);
  const head = new THREE.Group(); head.position.y = -1.89; headPivot.add(head);
  const skin = new THREE.Color("#c99573"), beard = new THREE.Color("#535053"), blush = new THREE.Color("#bd8066");
  const face = addMesh(head, surface(128,128,(u,v) => {
    const y = 1.94 + v * 1.37, angle = u * TAU;
    const [rx,rz] = profileAt(faceProfile,y);
    const x = Math.sin(angle) * rx, c = Math.cos(angle);
    return [x,y,c >= 0 ? faceDepth(x,y,c**2) : rz*c - 0.015];
  }, ([x,y],u) => {
    const front = Math.max(0,Math.cos(u*TAU));
    const tint = skin.clone();
    const flush = (gaussian(x,y,-0.26,2.5,0.13,0.1)+gaussian(x,y,0.26,2.5,0.13,0.1))*front*0.14;
    tint.lerp(blush,flush);
    tint.lerp(beard,beardDensity(x,y)*Math.min(1,front*3)*0.8);
    return tint.toArray();
  }),materials.face,"Sculpted head, nose and jaw");

  // Small deterministic stubble follows the same head surface, including cheeks.
  const stubble = [];
  let seed = 47;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i=0;i<4500;i++) {
    const y=1.98+random()*0.73, [rx]=profileAt(faceProfile,y), x=(random()*2-1)*rx*0.985;
    if (random()>beardDensity(x,y)*0.77) continue;
    const z=faceDepth(x,y,Math.max(0,1-(x/rx)**2))+0.003;
    const length=0.004+random()*0.008, width=0.0009+random()*0.0006;
    stubble.push(x-width,y,z,x+width,y,z,x+width*0.5,y-length,z+0.001);
  }
  const stubbleGeometry = new THREE.BufferGeometry();
  stubbleGeometry.setAttribute("position",new THREE.Float32BufferAttribute(stubble,3));
  stubbleGeometry.computeVertexNormals();
  addMesh(head,stubbleGeometry,materials.beard,"Short facial hair");

  const eyes = [];
  for (const side of [-1,1]) {
    const ear = oval(head,materials.skin,[side*0.454,2.616,-0.016],[0.081,0.157,0.082]);
    ear.rotation.z=-side*0.1;
    oval(head,materials.ear,[side*0.475,2.626,0.047],[0.041,0.101,0.035]);
    stroke(head,[[side*0.45,2.72,0.057],[side*0.5,2.74,0.044],[side*0.518,2.66,0.055],[side*0.492,2.54,0.056]],0.012,materials.skin);
    oval(head,materials.skin,[side*0.46,2.57,0.075],[0.025,0.038,0.02]);

    const eye = new THREE.Group();
    eye.position.set(side*0.211,2.735,faceDepth(side*0.211,2.735)+0.004);
    head.add(eye); eyes.push(eye);
    // Almond eye surface with shaped upper/lower lids and recessed dark irises.
    const eyeGeometry = surface(16,32,(u,v) => {
      const x=(u*2-1)*0.112, arc=Math.sin(u*Math.PI), t=v*2-1;
      return [x,t*(t>0?0.044:0.033)*arc,0.012+0.023*arc*Math.sqrt(Math.max(0,1-t*t))];
    });
    addMesh(eye,eyeGeometry,materials.sclera);
    oval(eye,materials.iris,[-side*0.002,0.005,0.037],[0.033,0.034,0.008]);
    oval(eye,materials.pupil,[-side*0.002,0.005,0.044],[0.017,0.019,0.005]);
    oval(eye,materials.glint,[-0.01,0.016,0.049],[0.005,0.005,0.002],12);
    stroke(eye,[[-0.112,0,0.008],[-0.06,0.034,0.025],[0,0.045,0.03],[0.06,0.032,0.023],[0.112,0,0.005]],0.009,materials.skin);
    stroke(eye,[[-0.112,0,0.008],[0,-0.033,0.027],[0.112,0,0.005]],0.007,materials.skin);
    stroke(head,[[side*0.09,2.841,0.394],[side*0.19,2.861,0.371],[side*0.28,2.85,0.31],[side*0.351,2.826,0.239]],0.014,materials.hair);
    // Nostrils sit just below the integrated alae, not on the nose tip.
    oval(head,materials.ear,[side*0.063,2.467,0.499],[0.022,0.009,0.012],20);
    stroke(head,[[side*0.011,2.382,0.386],[side*0.055,2.376,0.397],[side*0.105,2.364,0.385],[side*0.144,2.343,0.354]],0.016,materials.beard);
  }

  const mouth = new THREE.Group(); mouth.position.set(0,2.312,0.373); head.add(mouth);
  const opening = oval(mouth,materials.mouth,[0,0.002,0.01],[0.141,0.012,0.018]);
  const teeth = oval(mouth,materials.teeth,[0,0.005,0.025],[0.097,0.007,0.006]);
  stroke(mouth,[[-0.148,0.025,-0.024],[-0.075,0.018,0.019],[-0.029,0.03,0.033],[0,0.023,0.036],[0.031,0.031,0.033],[0.08,0.022,0.018],[0.148,0.028,-0.024]],0.012,materials.lips);
  const lowerLip = stroke(mouth,[[-0.144,0.02,-0.021],[-0.072,-0.02,0.025],[0,-0.027,0.039],[0.075,-0.018,0.025],[0.144,0.024,-0.021]],0.016,materials.lips);

  const hair = new THREE.Group(); hair.name="Swept quiff and fitted hairline"; head.add(hair);
  addMesh(hair,surface(48,112,(u,v)=>hairPoint(u*TAU,v)),materials.hair);
  // Flattened overlapping locks hug the cap, with a sideways sweep at the crown.
  for(let i=0;i<34;i++) {
    const theta=-1.65+i/33*3.3;
    addMesh(hair,surface(28,4,(u,v)=>{
      const t=0.015+v*0.85, width=0.037*Math.sin(Math.PI*(0.04+v*0.92))**0.5;
      return hairPoint(theta-0.43*Math.sin(t*Math.PI)+(u-0.5)*width*2,t,0.003+0.009*Math.sin(u*Math.PI));
    }),i%4===0?materials.hairRidge:materials.hair);
  }
  for(let i=0;i<68;i++) {
    const theta=-1.68+i/67*3.36;
    stroke(hair,Array.from({length:13},(_,j)=>{
      const v=0.02+j/12*0.75;
      return hairPoint(theta-0.43*Math.sin(v*Math.PI),v,0.009);
    }),0.0017,i%5===0?materials.hairFine:materials.hairRidge);
  }

  const glasses = new THREE.Group(); glasses.name="Round black spectacles"; head.add(glasses);
  for(const side of [-1,1]) {
    const center=side*0.221;
    const framePoint=(angle)=>{
      const x=center+Math.cos(angle)*0.174;
      return [x,2.691+Math.sin(angle)*0.174,0.488-0.43*x*x];
    };
    stroke(glasses,Array.from({length:64},(_,i)=>framePoint(i/64*TAU)),0.012,materials.frames,true);
    const lens = oval(glasses,materials.lens,[center,2.691,0.481-0.43*center*center],[0.165,0.165,0.006],40);
    lens.castShadow=false;
    stroke(glasses,[[side*0.39,2.731,0.416],[side*0.46,2.725,0.26],[side*0.47,2.7,0.04],[side*0.46,2.64,-0.037]],0.009,materials.frames);
  }
  stroke(glasses,[[-0.05,2.746,0.494],[0,2.763,0.512],[0.05,2.746,0.494]],0.009,materials.frames);
  glasses.traverse(node => { node.castShadow = false; });

  const neckProfile=[[1.37,0.305,0.245],[1.54,0.262,0.221],[1.78,0.228,0.213],[2.01,0.228,0.224]];
  addMesh(body,surface(28,48,(u,v)=>{
    const y=1.37+v*0.64,[rx,rz]=profileAt(neckProfile,y);
    return [Math.sin(u*TAU)*rx,y,Math.cos(u*TAU)*rz-0.04];
  }),materials.skin,"Neck");
  const torsoProfile=[[0.16,0.99,0.29],[0.36,1.015,0.325],[0.9,1.0,0.354],[1.2,0.9,0.321],[1.38,0.57,0.258],[1.53,0.293,0.22]];
  const torso=addMesh(body,surface(64,96,(u,v)=>{
    const y=0.16+v*1.37,[rx,rz]=profileAt(torsoProfile,y),angle=u*TAU;
    const fold=0.008*Math.sin(angle*18+y*3)*Math.sin(v*Math.PI);
    return [Math.sin(angle)*rx,y,(rz+fold)*Math.cos(angle)-0.04];
  }),materials.shirt,"Continuous shirt and shoulders");
  for(const side of [-1,1]) {
    clothPanel(body,[[side*0.25,1.695],[side*0.432,1.475],[side*0.266,1.235],[side*0.04,1.49]],materials.collar);
    stroke(body,[[side*0.31,1.49,0.265],[side*0.7,1.32,0.221],[side*0.89,1.12,0.19]],0.004,materials.seam);
  }
  clothPanel(body,[[-0.115,1.464],[0.11,1.464],[0.064,1.267],[-0.055,1.267]],materials.tie,0.055);
  const tie=clothPanel(body,[[-0.055,1.285],[0.065,1.285],[0.132,0.386],[0.011,0.2],[-0.111,0.375]],materials.tie,0.038);
  tie.position.z=0.323;
  stroke(body,[[-0.018,1.24,0.38],[0.013,0.88,0.384],[0.033,0.41,0.371]],0.003,materials.tie);

  root.userData = { source:"procedural-turntable-study", frontAxis:"+Z" };
  return {
    root, kind:"procedural", clips:[],
    rig:{headPivot,body,eyes,opening,teeth,lowerLip,face,torso},
    dispose() {
      const geometries=new Set(), usedMaterials=new Set(Object.values(materials));
      root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);});
      geometries.forEach(geometry=>geometry.dispose());
      usedMaterials.forEach(material=>material.dispose());
    },
  };
}
