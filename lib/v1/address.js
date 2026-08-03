// Addressing — the shared coordinate language between a human and an AI
// (doctrine Part 1 · Addressing, and Part 9.8 · navigation protocol).
//
// An AI cannot see the world; a human cannot read the scene graph. Addressing
// is what lets both describe the same thing without either guessing. "The wall
// near the fountain" is useless with ten similar walls; "AST-WALL-0043 at
// L0-H12-R08" is a work order.
//
// THE HALF THAT USUALLY GETS SKIPPED
// Most implementations only do position -> address, which lets a human report a
// location. The reverse — address -> camera pose -> screenshot — is what lets an
// AI go and LOOK at the place it was told about, with no screenshot round-trip
// and no describing. Both directions are here; build both or you have only a
// labelling scheme.
import * as THREE from "three";

export const GRID = {
  /** Module size in metres. 4 m matches the doctrine's modular grid. */
  MODULE: 4,
  /** World extent in metres (square, centred on the origin). */
  SIZE: 120,
};

/** Configure the grid before registering anything. */
export function configureGrid({ module, size } = {}) {
  if (module) GRID.MODULE = module;
  if (size) GRID.SIZE = size;
}

// ---------------------------------------------------------------------------
// position <-> address
// ---------------------------------------------------------------------------

/** World position -> stable label `L{level}-H{col}-R{row}`. Zero-padded so it sorts. */
export function gridAddress(x, z, level = 0) {
  const col = Math.floor((x + GRID.SIZE / 2) / GRID.MODULE);
  const row = Math.floor((z + GRID.SIZE / 2) / GRID.MODULE);
  return `L${level}-H${String(col).padStart(2, "0")}-R${String(row).padStart(2, "0")}`;
}

/** Address -> the world position at that cell's centre. The inverse of the above. */
export function addressToPosition(address) {
  const m = /^L(-?\d+)-H(-?\d+)-R(-?\d+)$/.exec(String(address).trim().toUpperCase());
  if (!m) throw new Error(`addressToPosition("${address}"): not an L#-H##-R## address`);
  const level = +m[1], col = +m[2], row = +m[3];
  return {
    x: -GRID.SIZE / 2 + col * GRID.MODULE + GRID.MODULE / 2,
    z: -GRID.SIZE / 2 + row * GRID.MODULE + GRID.MODULE / 2,
    level,
  };
}

// ---------------------------------------------------------------------------
// asset registry — every object gets a unique ID and an address, nothing repeats
// ---------------------------------------------------------------------------

const registry = new Map();
const roleCounters = new Map();

/**
 * Register an object so it can be named, found and reported.
 * @returns {string} the assigned ID, e.g. "AST-HULLPLATE-0007"
 */
export function registerAsset(object3D, role, opts = {}) {
  const slug = String(role || "asset").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const n = (roleCounters.get(slug) || 0) + 1;
  roleCounters.set(slug, n);
  const id = `AST-${slug}-${String(n).padStart(4, "0")}`;

  object3D.updateWorldMatrix(true, false);
  const pos = new THREE.Vector3().setFromMatrixPosition(object3D.matrixWorld);
  const box = new THREE.Box3().setFromObject(object3D);
  const size = box.getSize(new THREE.Vector3());

  const record = {
    id,
    role: slug.toLowerCase(),
    address: gridAddress(pos.x, pos.z, opts.level ?? 0),
    pos: [+pos.x.toFixed(3), +pos.y.toFixed(3), +pos.z.toFixed(3)],
    size: [+size.x.toFixed(3), +size.y.toFixed(3), +size.z.toFixed(3)],
    flags: opts.flags || {},
    object: object3D,
  };
  object3D.userData.assetId = id;
  object3D.userData.address = record.address;
  registry.set(id, record);
  return id;
}

export function getAsset(id) { return registry.get(id) || null; }

/** Every asset at an address, so "what is at L0-H12-R08" is answerable. */
export function assetsAt(address) {
  const a = String(address).trim().toUpperCase();
  return [...registry.values()].filter((r) => r.address === a);
}

/** Machine-readable dump — the half of the scene report that is about identity. */
export function addressReport() {
  return {
    generatedAt: new Date().toISOString(),
    grid: { module: GRID.MODULE, size: GRID.SIZE, cells: Math.round(GRID.SIZE / GRID.MODULE) },
    count: registry.size,
    assets: [...registry.values()].map(({ object, ...rest }) => rest),
  };
}

// ---------------------------------------------------------------------------
// address -> camera pose  (the direction that makes this worth building)
// ---------------------------------------------------------------------------

/**
 * Place a camera to look at an address. This is what lets a human say
 * "look at L0-H12-R08" and have the AI actually go and look.
 *
 * @param {THREE.Camera} camera
 * @param {string} address
 * @param {object} opts
 *   distance  metres back from the cell centre (default 3 module widths)
 *   height    eye height above the cell (default 1.65, human eye level)
 *   heading   radians; which way to approach from (default from -Z)
 *   pitch     radians; default a slight downward tilt
 * @returns {{address, target, position, heading, pitch}} what it did, for the log
 */
export function lookAtAddress(camera, address, opts = {}) {
  const { x, z } = addressToPosition(address);
  const distance = opts.distance ?? GRID.MODULE * 3;
  const height = opts.height ?? 1.65;
  const heading = opts.heading ?? 0;
  const pitch = opts.pitch ?? -0.12;

  const cx = x + Math.sin(heading) * distance;
  const cz = z + Math.cos(heading) * distance;
  camera.position.set(cx, height, cz);
  camera.rotation.order = "YXZ";
  // Yaw is `heading`, NOT heading + PI. The camera stands at
  // (x + sin h·d, z + cos h·d), so the direction back to the target is
  // (-sin h, -cos h) — and a yaw of θ already points at (-sin θ, -cos θ).
  // Adding PI faces it directly away, which put the subject behind the camera
  // and rendered an empty plane. Caught by running it, not by reading it.
  camera.rotation.set(pitch, heading, 0);

  return {
    address: String(address).toUpperCase(),
    target: [x, 0, z],
    position: [+cx.toFixed(3), +height.toFixed(3), +cz.toFixed(3)],
    heading, pitch,
  };
}

// ---------------------------------------------------------------------------
// inspection layer — the same scene, another layer (doctrine Part 5, 9.6)
// ---------------------------------------------------------------------------

function makeTextSprite(text, color = "#58d6ff", scale = 0.9) {
  const lines = String(text).split("\n");
  const pad = 10, font = 34, lh = font * 1.25;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
  c.width = Math.ceil(w + pad * 2);
  c.height = Math.ceil(lines.length * lh + pad * 2);
  const g = c.getContext("2d");
  g.fillStyle = "rgba(8,12,16,0.78)";
  g.fillRect(0, 0, c.width, c.height);
  g.font = `600 ${font}px system-ui, sans-serif`;
  g.fillStyle = color;
  g.textBaseline = "top";
  lines.forEach((l, i) => g.fillText(l, pad, pad + i * lh));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
  sp.scale.set((c.width / 100) * scale, (c.height / 100) * scale, 1);
  return sp;
}

/**
 * Build the inspection overlay: module grid, cell address labels, asset ID tags.
 * Returns a Group you add to the scene and toggle with .visible.
 *
 * Labels are drawn for cells within `radius` of the origin only — labelling a
 * whole world at once is thousands of sprites and thousands of draw calls.
 */
export function buildInspectionLayer({ radius = 6, showAssets = true, y = 0.05 } = {}) {
  const group = new THREE.Group();
  group.name = "InspectionLayer";

  const cells = Math.round(GRID.SIZE / GRID.MODULE);
  const half = GRID.SIZE / 2;
  const pts = [];
  for (let i = 0; i <= cells; i++) {
    const p = -half + i * GRID.MODULE;
    pts.push(-half, y, p, half, y, p, p, y, -half, p, y, half);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x2f6f8f, transparent: true, opacity: 0.5 }));
  grid.name = "ModuleGrid";
  group.add(grid);

  for (let c = 0; c < cells; c++) {
    for (let r = 0; r < cells; r++) {
      const cx = -half + c * GRID.MODULE + GRID.MODULE / 2;
      const cz = -half + r * GRID.MODULE + GRID.MODULE / 2;
      if (Math.hypot(cx, cz) > radius * GRID.MODULE) continue;
      const sp = makeTextSprite(gridAddress(cx, cz), "#58d6ff", 0.7);
      sp.position.set(cx, y + 0.5, cz);
      group.add(sp);
    }
  }

  if (showAssets) {
    for (const rec of registry.values()) {
      const sp = makeTextSprite(`${rec.id}\n${rec.role} · ${rec.address}`, "#ffc455", 0.7);
      sp.position.set(rec.pos[0], rec.pos[1] + rec.size[1] * 0.6 + 0.35, rec.pos[2]);
      group.add(sp);
    }
  }
  return group;
}
