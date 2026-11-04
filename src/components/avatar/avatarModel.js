import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildAvatar } from "./buildAvatar.js";

export function disposeObject(object) {
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
  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => item.dispose());
}

export function createPlaceholderModel() {
  const model = buildAvatar();
  return {
    ...model,
    kind: "placeholder",
    clips: [],
    dispose: () => disposeObject(model.root),
  };
}

// Loading and framing have no knowledge of animation or speech providers.
export async function loadAvatarModel(config, { signal } = {}) {
  const response = await fetch(config.modelUrl, { signal });
  if (!response.ok) throw new Error("Avatar model could not be loaded.");
  const bytes = await response.arrayBuffer();
  const base = new URL(".", new URL(config.modelUrl, window.location.href))
    .href;
  const gltf = await new GLTFLoader().parseAsync(bytes, base);
  if (signal?.aborted) {
    disposeObject(gltf.scene);
    throw new DOMException("Cancelled", "AbortError");
  }
  if (config.kind === "portrait-geometry") {
    const mesh = gltf.scene.getObjectByProperty("isMesh", true);
    if (!mesh) {
      disposeObject(gltf.scene);
      throw new Error("No portrait geometry.");
    }
    const model = createPlaceholderModel();
    try {
      model.setPortraitGeometry(mesh.geometry.clone());
    } catch (error) {
      model.dispose();
      throw error;
    } finally {
      disposeObject(gltf.scene);
    }
    return model;
  }
  const root = new THREE.Group();
  root.add(gltf.scene);
  gltf.scene.rotation.y += THREE.MathUtils.degToRad(
    Number(config.rotationY) || 0,
  );
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) {
    disposeObject(root);
    throw new Error("Avatar has invalid bounds.");
  }
  const center = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  root.remove(gltf.scene);
  holder.add(gltf.scene);
  holder.position.sub(center);
  root.add(holder);
  const height = Number(config.height) > 0 ? Number(config.height) : 3.4;
  root.scale.setScalar(height / size.y);
  root.position.y = height / 2 + (Number(config.offsetY) || 0);
  return {
    root,
    kind: "custom",
    clips: gltf.animations,
    config,
    dispose: () => disposeObject(root),
  };
}
