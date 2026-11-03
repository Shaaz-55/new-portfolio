import * as THREE from "three";

// An original procedural bust. Deliberately illustrative; never a claimed likeness.
export function buildAvatar() {
  const root = new THREE.Group();
  const head = new THREE.Group();
  let referenceGeometry, referencePositions, referenceOriginal, mouthWeights;
  const hairGroup = new THREE.Group();
  head.add(hairGroup);
  const skin = new THREE.MeshStandardMaterial({
    color: "#9c816a",
    roughness: 0.91,
    metalness: 0.02,
  });
  const lips = new THREE.MeshStandardMaterial({
    color: "#756052",
    roughness: 1,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: "#171b18",
    roughness: 0.96,
  });
  const hairHighlight = new THREE.MeshStandardMaterial({
    color: "#252923",
    roughness: 0.88,
  });
  const jacket = new THREE.MeshStandardMaterial({
    color: "#1d2926",
    roughness: 0.87,
    metalness: 0.08,
  });
  const collarMaterial = new THREE.MeshStandardMaterial({
    color: "#283832",
    roughness: 0.88,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: "#0b1210",
    roughness: 1,
  });
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: "#7b8070",
    roughness: 0.65,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: "#191e19",
    roughness: 0.48,
  });
  const eyeGroups = [];

  function ellipsoid(parent, material, position, scale, segments = 40) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, segments, 28),
      material,
    );
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  function curve(parent, points, radius, material) {
    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(...point)),
      ),
      24,
      radius,
      6,
      false,
    );
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    return mesh;
  }
  function panel(points, material) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) =>
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y),
    );
    shape.closePath();
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSize: 0.035,
        bevelThickness: 0.025,
        bevelSegments: 3,
        steps: 1,
      }),
      material,
    );
    mesh.position.z = 0.28;
    root.add(mesh);
    return mesh;
  }

  // Tailored, gently tapered shoulders and torso; the crop is a medium close-up.
  const torso = ellipsoid(root, jacket, [0, 0.68, -0.035], [0.98, 0.99, 0.39]);
  ellipsoid(root, jacket, [-0.74, 0.72, -0.01], [0.38, 0.67, 0.35]).rotation.z =
    -0.23;
  ellipsoid(root, jacket, [0.74, 0.72, -0.01], [0.38, 0.67, 0.35]).rotation.z =
    0.23;
  ellipsoid(root, shirt, [0, 1.29, 0.23], [0.33, 0.51, 0.19]);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.3, 0.64, 40),
    skin,
  );
  neck.position.set(0, 1.82, -0.005);
  root.add(neck);
  panel(
    [
      [-0.25, 1.79],
      [-0.49, 1.55],
      [-0.37, 0.98],
      [-0.07, 1.36],
    ],
    collarMaterial,
  );
  panel(
    [
      [0.25, 1.79],
      [0.49, 1.55],
      [0.37, 0.98],
      [0.07, 1.36],
    ],
    collarMaterial,
  );
  curve(
    root,
    [
      [0, 0.15, 0.369],
      [0, 0.75, 0.382],
      [0, 1.26, 0.4],
    ],
    0.01,
    new THREE.MeshStandardMaterial({
      color: "#617568",
      roughness: 0.6,
      metalness: 0.5,
    }),
  );
  curve(
    root,
    [
      [-0.52, 1.43, 0.33],
      [-0.78, 1.17, 0.29],
      [-0.91, 0.68, 0.23],
    ],
    0.006,
    collarMaterial,
  );
  curve(
    root,
    [
      [0.52, 1.43, 0.33],
      [0.78, 1.17, 0.29],
      [0.91, 0.68, 0.23],
    ],
    0.006,
    collarMaterial,
  );

  const profile = [
    [1.99, 0.09, 0.1],
    [2.04, 0.19, 0.22],
    [2.14, 0.3, 0.28],
    [2.32, 0.39, 0.32],
    [2.52, 0.455, 0.35],
    [2.72, 0.45, 0.355],
    [2.93, 0.44, 0.36],
    [3.12, 0.38, 0.33],
    [3.27, 0.23, 0.24],
    [3.34, 0.01, 0.01],
  ];
  const lerpProfile = (y) => {
    let k = 0;
    while (k < profile.length - 2 && y > profile[k + 1][0]) k++;
    const t = (y - profile[k][0]) / (profile[k + 1][0] - profile[k][0]);
    return [
      THREE.MathUtils.lerp(profile[k][1], profile[k + 1][1], t),
      THREE.MathUtils.lerp(profile[k][2], profile[k + 1][2], t),
    ];
  };
  const gauss = (x, y, cx, cy, sx, sy) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  const vertices = [],
    indices = [],
    colors = [];
  const heightSegments = 100,
    radialSegments = 112;
  const baseColor = new THREE.Color("#b39b82");
  for (let row = 0; row <= heightSegments; row++) {
    const y = 1.99 + (row / heightSegments) * 1.35;
    const [rx, rz] = lerpProfile(y);
    for (let col = 0; col <= radialSegments; col++) {
      const angle = (col / radialSegments) * Math.PI * 2;
      const x = Math.sin(angle) * rx;
      const front = Math.max(0, Math.cos(angle));
      let z = Math.cos(angle) * rz;
      z +=
        front ** 10 *
        (0.175 * gauss(x, y, 0, 2.65, 0.065, 0.22) +
          0.225 * gauss(x, y, 0, 2.48, 0.087, 0.075) +
          0.045 * gauss(x, y, 0, 2.26, 0.17, 0.1) +
          0.025 * gauss(x, y, 0, 2.08, 0.16, 0.06) +
          0.04 * gauss(x, y, -0.27, 2.51, 0.15, 0.1) +
          0.04 * gauss(x, y, 0.27, 2.51, 0.15, 0.1) -
          0.045 * gauss(x, y, -0.2, 2.7, 0.115, 0.064) -
          0.045 * gauss(x, y, 0.2, 2.7, 0.115, 0.064));
      vertices.push(x, y, z);
      const tint = baseColor.clone();
      const beard = gauss(x, y, 0, 2.21, 0.4, 0.22) * front * 0.17;
      tint.multiplyScalar(1 - beard);
      colors.push(tint.r, tint.g, tint.b);
      if (row < heightSegments && col < radialSegments) {
        const a = row * (radialSegments + 1) + col,
          b = a + radialSegments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  faceGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  faceGeometry.setIndex(indices);
  faceGeometry.computeVertexNormals();
  head.add(
    new THREE.Mesh(
      faceGeometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        side: THREE.DoubleSide,
      }),
    ),
  );

  for (const side of [-1, 1]) {
    const ear = ellipsoid(
      head,
      skin,
      [side * 0.46, 2.57, -0.005],
      [0.086, 0.151, 0.079],
    );
    ear.rotation.z = side * -0.08;
    ellipsoid(head, lips, [side * 0.491, 2.57, 0.053], [0.03, 0.079, 0.016]);
    const eye = new THREE.Group();
    eye.position.set(side * 0.205, 2.702, 0.321);
    head.add(eye);
    eyeGroups.push(eye);
    // Narrow almond eyes with restrained highlights and upper/lower lids.
    ellipsoid(eye, eyeWhite, [0, 0, 0], [0.098, 0.028, 0.029]);
    ellipsoid(
      eye,
      pupilMaterial,
      [-side * 0.007, 0, 0.027],
      [0.031, 0.026, 0.008],
    );
    ellipsoid(
      eye,
      new THREE.MeshBasicMaterial({ color: "#e2e1c5" }),
      [-0.008, 0.009, 0.035],
      [0.005, 0.004, 0.002],
      12,
    );
    curve(
      eye,
      [
        [-0.103, 0, 0],
        [-0.05, 0.032, 0.016],
        [0.035, 0.032, 0.02],
        [0.1, 0, -0.006],
      ],
      0.011,
      skin,
    );
    curve(
      eye,
      [
        [-0.102, -0.005, 0],
        [0, -0.031, 0.018],
        [0.1, 0, -0.006],
      ],
      0.008,
      skin,
    );
    curve(
      head,
      [
        [side * 0.1, 2.8, 0.362],
        [side * 0.205, 2.818, 0.344],
        [side * 0.305, 2.79, 0.299],
      ],
      0.019,
      hair,
    );
    ellipsoid(head, lips, [side * 0.062, 2.45, 0.452], [0.025, 0.013, 0.009]);
  }

  const mouth = new THREE.Group();
  mouth.position.set(0, 2.268, 0.359);
  head.add(mouth);
  const mouthOpening = ellipsoid(
    mouth,
    new THREE.MeshStandardMaterial({ color: "#302822", roughness: 1 }),
    [0, -0.009, 0.015],
    [0.117, 0.008, 0.014],
  );
  curve(
    mouth,
    [
      [-0.125, 0, 0],
      [-0.061, 0.01, 0.018],
      [-0.027, 0.017, 0.026],
      [0, 0.008, 0.028],
      [0.027, 0.017, 0.026],
      [0.065, 0.01, 0.018],
      [0.125, 0, 0],
    ],
    0.009,
    lips,
  );
  const lowerLip = curve(
    mouth,
    [
      [-0.116, -0.009, 0],
      [0, -0.028, 0.023],
      [0.116, -0.009, 0],
    ],
    0.014,
    lips,
  );

  // A swept hairstyle, built from a single cap and subtle sculpted locks.
  const hairCap = ellipsoid(
    hairGroup,
    hair,
    [0, 3.095, -0.064],
    [0.459, 0.317, 0.4],
  );
  hairCap.rotation.z = -0.055;
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const startX = -0.403 + t * 0.78;
    const hairlineY = 3.026 + 0.06 * Math.sin(t * Math.PI) - t * 0.07;
    curve(
      hairGroup,
      [
        [startX, hairlineY, 0.245 + 0.048 * Math.sin(t * Math.PI)],
        [startX - 0.065, 3.25, 0.3],
        [startX - 0.14, 3.382 - Math.abs(t - 0.5) * 0.19, 0.085],
        [startX - 0.12, 3.24, -0.235],
      ],
      0.018,
      i % 3 === 0 ? hairHighlight : hair,
    );
  }
  for (const side of [-1, 1])
    ellipsoid(hairGroup, hair, [side * 0.427, 2.94, -0.09], [0.041, 0.2, 0.2]);

  // Pivot around the neck so attentive head motions stay anatomically grounded.
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.92;
  head.position.y = -1.92;
  headPivot.add(head);
  root.add(headPivot);
  return {
    root,
    setPortraitGeometry(geometry) {
      head.children.forEach((child) => {
        child.visible = child === hairGroup || eyeGroups.includes(child);
      });
      mouth.visible = true;
      mouth.children.forEach((child) => {
        child.visible = child === mouthOpening;
      });
      referenceGeometry = geometry;
      referenceGeometry.scale(0.26, 0.26, 0.26);
      referenceGeometry.translate(0, 2.3, -0.14);
      referencePositions = referenceGeometry.attributes.position;
      const retained = [];
      const index = referenceGeometry.index;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i),
          b = index.getX(i + 1),
          c = index.getX(i + 2);
        if (
          Math.min(
            referencePositions.getY(a),
            referencePositions.getY(b),
            referencePositions.getY(c),
          ) > 2.035
        )
          retained.push(a, b, c);
      }
      referenceGeometry.setIndex(retained);
      mouthWeights = new Float32Array(referencePositions.count);
      for (let i = 0; i < referencePositions.count; i++) {
        const x = referencePositions.getX(i),
          y = referencePositions.getY(i),
          z = referencePositions.getZ(i);
        if (z > 0.15) {
          const socket =
            0.045 *
            (gauss(x, y, -0.205, 2.715, 0.087, 0.032) +
              gauss(x, y, 0.205, 2.715, 0.087, 0.032));
          referencePositions.setZ(i, z - socket);
          mouthWeights[i] = y < 2.432 ? gauss(x, y, 0, 2.39, 0.19, 0.085) : 0;
        }
      }
      referenceGeometry.computeVertexNormals();
      referenceOriginal = new Float32Array(referencePositions.array);
      const portrait = new THREE.Mesh(referenceGeometry, skin);
      portrait.position.y = -1.92;
      headPivot.add(portrait);
      eyeGroups.forEach((eye) => {
        eye.position.y = 2.718;
        eye.position.z = 0.358;
      });
      mouth.position.set(0, 2.432, 0.461);
      mouth.scale.set(0.9, 0.7, 1);
      for (const side of [-1, 1])
        curve(
          head,
          [
            [side * 0.11, 2.794, 0.41],
            [side * 0.215, 2.808, 0.379],
            [side * 0.305, 2.79, 0.327],
          ],
          0.012,
          hair,
        );
    },
    update(time, state, reducedMotion) {
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
  };
}
