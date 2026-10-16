import * as THREE from "three";

const DEFAULT_STYLE = {
  body: "male",
  primaryColor: "#48dff2",
  secondaryColor: "#202b62",
  skinColor: "#8d5524",
  hairColor: "#17120f",
  hair: "short",
  hat: "none",
  accessory: "backpack",
};

const colorOr = (value, fallback) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.18, ...extra });
}

export function normalizeStyle(style = {}) {
  const allowed = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
  const clothing = style.clothing ?? style.colors ?? {};
  const bodyValue = String(first(style.body, style.bodyType, style.gender, DEFAULT_STYLE.body)).toLowerCase();
  const hairValue = String(first(style.hair, style.hairStyle, style.hairstyle, DEFAULT_STYLE.hair)).toLowerCase();
  const hatValue = String(first(style.hat, style.hatStyle, DEFAULT_STYLE.hat)).toLowerCase();
  const accessoryValue = String(first(style.accessory, style.accessoryType, style.accessoryStyle, DEFAULT_STYLE.accessory)).toLowerCase();

  return {
    body: allowed(
      ({ woman: "female", feminine: "female", man: "male", masculine: "male" })[bodyValue] ?? bodyValue,
      ["female", "male"],
      DEFAULT_STYLE.body,
    ),
    primaryColor: colorOr(first(style.primaryColor, style.shirtColor, style.topColor, clothing.primaryColor, clothing.shirt), DEFAULT_STYLE.primaryColor),
    secondaryColor: colorOr(first(style.secondaryColor, style.pantsColor, style.bottomColor, clothing.secondaryColor, clothing.pants), DEFAULT_STYLE.secondaryColor),
    skinColor: colorOr(first(style.skinColor, style.skin, style.skinTone), DEFAULT_STYLE.skinColor),
    hairColor: colorOr(first(style.hairColor, style.hairColour), DEFAULT_STYLE.hairColor),
    hair: allowed(
      ({ dreadlocks: "dreads", locs: "dreads", pony: "ponytail" })[hairValue] ?? hairValue,
      ["short", "afro", "braids", "bun", "ponytail", "dreads", "bald"],
      DEFAULT_STYLE.hair,
    ),
    hat: allowed(
      ({ no: "none", "top-hat": "tophat" })[hatValue] ?? hatValue,
      ["none", "cap", "beanie", "tophat", "crown"],
      DEFAULT_STYLE.hat,
    ),
    accessory: allowed(
      ({ no: "none" })[accessoryValue] ?? accessoryValue,
      ["none", "glasses", "earrings", "beard", "scarf", "backpack"],
      DEFAULT_STYLE.accessory,
    ),
  };
}

export function createCharacter(styleInput = {}) {
  const style = normalizeStyle(styleInput);
  const group = new THREE.Group();
  const skin = material(style.skinColor);
  const top = material(style.primaryColor, { metalness: 0.28 });
  const legs = material(style.secondaryColor);
  const hair = material(style.hairColor);
  const dark = material("#101629", { metalness: 0.45 });
  const glow = new THREE.MeshStandardMaterial({ color: "#48e7ff", emissive: "#087cba", emissiveIntensity: 1.7, metalness: 0.5 });
  const add = (geometry, mat, pos, parent = group) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const sphere = (radius, scale, mat, pos, parent = group) => {
    const mesh = add(new THREE.SphereGeometry(radius, 20, 16), mat, pos, parent);
    mesh.scale.set(...scale);
    return mesh;
  };
  const box = (size, mat, pos, parent = group) => add(new THREE.BoxGeometry(...size), mat, pos, parent);

  // Body style changes the silhouette as well as colours and accessories.
  const feminine = style.body === "female";
  sphere(0.33, feminine ? [0.84, 1, 0.62] : [0.82, 1, 0.62], skin, [0, 1.62, 0]); // head
  box(feminine ? [0.46, 0.58, 0.32] : [0.5, 0.58, 0.32], top, [0, 1.08, 0]); // torso
  box(feminine ? [0.56, 0.14, 0.37] : [0.54, 0.12, 0.35], dark, [0, 0.79, 0]); // belt/hips
  if (feminine) {
    // The start.ng body value must be recognisable in-game, not just stored as metadata.
    add(new THREE.CylinderGeometry(0.23, 0.34, 0.24, 10), legs, [0, 0.62, 0]);
  }
  box([0.19, 0.46, 0.23], legs, [-0.14, 0.43, 0]);
  box([0.19, 0.46, 0.23], legs, [0.14, 0.43, 0]);
  box([0.25, 0.13, 0.36], dark, [-0.14, 0.13, -0.04]);
  box([0.25, 0.13, 0.36], dark, [0.14, 0.13, -0.04]);
  const leftArm = new THREE.Group(); leftArm.position.set(-0.32, 1.28, 0); group.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(0.32, 1.28, 0); group.add(rightArm);
  for (const [arm, sign] of [[leftArm, -1], [rightArm, 1]]) {
    box([0.16, 0.42, 0.19], top, [sign * 0.04, -0.2, 0], arm);
    sphere(0.11, [1, 1, 1], skin, [sign * 0.04, -0.43, 0], arm);
  }
  // Hair choices use distinct silhouettes; unknown future values safely fall back to short hair.
  if (style.hair !== "bald") {
    if (style.hair === "afro" || style.hair === "dreads") {
      sphere(style.hair === "afro" ? 0.34 : 0.31, [1.12, 0.76, 0.95], hair, [0, 1.87, 0.02]);
      if (style.hair === "dreads") {
        for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.045, 0.055, 0.24, 8), hair, [-0.22 + i * 0.11, 1.66, 0.02]);
      }
    } else if (style.hair === "bun") {
      sphere(0.29, [1, 0.5, 0.9], hair, [0, 1.84, 0.03]);
      sphere(0.11, [1, 1, 1], hair, [0, 2.02, -0.18]);
    } else if (style.hair === "ponytail") {
      sphere(0.29, [1, 0.5, 0.9], hair, [0, 1.84, 0.03]);
      sphere(0.09, [1, 1.6, 1], hair, [0, 1.66, -0.28]);
    } else if (style.hair === "braids") {
      sphere(0.3, [1, 0.48, 0.95], hair, [0, 1.85, 0.02]);
      for (const x of [-0.23, -0.12, 0, 0.12, 0.23]) add(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6), hair, [x, 1.66, 0.01]);
    } else {
      sphere(0.29, [1, 0.43, 0.9], hair, [0, 1.85, 0.02]);
    }
  }
  if (style.hat !== "none") {
    const hatMat = material(style.hat === "crown" ? "#ffc857" : style.primaryColor, { metalness: 0.45 });
    if (style.hat === "crown") {
      add(new THREE.CylinderGeometry(0.22, 0.28, 0.15, 5), hatMat, [0, 2.02, 0]);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        add(new THREE.ConeGeometry(0.055, 0.14, 5), hatMat, [Math.cos(a) * 0.18, 2.16, Math.sin(a) * 0.18]);
      }
    } else if (style.hat === "tophat") {
      add(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 16), hatMat, [0, 2.02, 0]);
      add(new THREE.CylinderGeometry(0.17, 0.2, 0.27, 16), hatMat, [0, 2.17, 0]);
    } else {
      add(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatMat, [0, 1.97, 0]);
      if (style.hat === "cap") box([0.3, 0.035, 0.2], hatMat, [0, 1.96, 0.17]);
    }
  }
  if (style.accessory === "glasses") {
    const lens = new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.6, roughness: 0.2 });
    box([0.19, 0.08, 0.035], lens, [-0.11, 1.65, 0.29]);
    box([0.19, 0.08, 0.035], lens, [0.11, 1.65, 0.29]);
    box([0.07, 0.025, 0.035], dark, [0, 1.65, 0.29]);
  } else if (style.accessory === "earrings") {
    for (const x of [-0.27, 0.27]) add(new THREE.TorusGeometry(0.045, 0.012, 6, 12), material("#ffc857", { metalness: 0.8 }), [x, 1.49, 0.03]);
  } else if (style.accessory === "beard") {
    sphere(0.18, [1, 0.5, 0.35], hair, [0, 1.43, 0.23]);
  } else if (style.accessory === "scarf") {
    box([0.48, 0.12, 0.39], material("#ff6d8a"), [0, 1.35, 0]);
    box([0.12, 0.34, 0.09], material("#ff6d8a"), [0.16, 1.12, 0.19]);
  } else if (style.accessory === "backpack") {
    box([0.32, 0.38, 0.16], dark, [0, 1.1, -0.22]);
    sphere(0.1, [1, 1, 0.4], glow, [0, 1.1, -0.32]);
  }
  // Small emissive chest badge makes the avatar legible in the dark arena.
  sphere(0.07, [1, 1, 0.35], glow, [0, 1.13, 0.19]);
  group.userData.animationParts = { leftArm, rightArm };
  group.userData.startNgStyle = style;
  return group;
}
