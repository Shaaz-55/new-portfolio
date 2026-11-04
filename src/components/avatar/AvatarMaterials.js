import * as THREE from "three";

export function createAvatarMaterials() {
  return {
    face: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.89, metalness: 0 }),
    skin: new THREE.MeshStandardMaterial({ color: "#c99573", roughness: 0.8 }),
    ear: new THREE.MeshStandardMaterial({ color: "#a86f55", roughness: 0.91 }),
    lips: new THREE.MeshStandardMaterial({ color: "#ae7667", roughness: 0.74 }),
    mouth: new THREE.MeshStandardMaterial({ color: "#372323", roughness: 1 }),
    teeth: new THREE.MeshStandardMaterial({ color: "#d8cabb", roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: "#242124", roughness: 0.91 }),
    hairRidge: new THREE.MeshStandardMaterial({ color: "#2b272c", roughness: 0.93 }),
    hairFine: new THREE.MeshStandardMaterial({ color: "#302c30", roughness: 0.95 }),
    beard: new THREE.MeshStandardMaterial({ color: "#382a26", roughness: 1, side: THREE.DoubleSide }),
    sclera: new THREE.MeshStandardMaterial({ color: "#d4c6b6", roughness: 0.4 }),
    iris: new THREE.MeshPhysicalMaterial({ color: "#473728", roughness: 0.38, clearcoat: 0.65 }),
    pupil: new THREE.MeshPhysicalMaterial({ color: "#141210", roughness: 0.2, clearcoat: 1 }),
    glint: new THREE.MeshBasicMaterial({ color: "#f8eada" }),
    frames: new THREE.MeshStandardMaterial({ color: "#211f21", roughness: 0.38, metalness: 0.25 }),
    lens: new THREE.MeshPhysicalMaterial({ color: "#d1dbcd", roughness: 0.18, transparent: true, opacity: 0.045, depthWrite: false, clearcoat: 0.8 }),
    shirt: new THREE.MeshStandardMaterial({ color: "#e3d6d5", roughness: 0.96 }),
    collar: new THREE.MeshStandardMaterial({ color: "#e9dedc", roughness: 0.9, side: THREE.DoubleSide }),
    seam: new THREE.MeshStandardMaterial({ color: "#bba9aa", roughness: 1 }),
    tie: new THREE.MeshPhysicalMaterial({ color: "#373036", roughness: 0.72, sheen: 0.6, sheenColor: new THREE.Color("#76616a") }),
  };
}
