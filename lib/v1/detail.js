// Detailing kit — the shared vocabulary of tertiary form (doctrine Part 3B).
//
// "Build a detailing kit module so the whole world speaks one vocabulary instead
// of each asset being detailed ad hoc." This is that module. Every bolt in every
// asset comes from bolts() and therefore looks like every other bolt.
//
// TWO RULES THIS FILE EXISTS TO ENFORCE
//
// 1. BEVEL EVERY EXPOSED EDGE. A perfectly sharp 90 degree edge is a rendering
//    artifact, not an object. A 6-20 mm break catches a specular highlight and
//    is most of what makes a form read as manufactured. bevelBox() is the
//    default box for this reason — reach for it before BoxGeometry.
//
// 2. TERTIARY DETAIL IS INSTANCED. Rivets number in the hundreds. Hundreds of
//    Mesh objects is hundreds of draw calls; one InstancedMesh is one. Every
//    repeater here returns an InstancedMesh.
import * as THREE from "three";

/** Cache by dimension — a world reuses a few dozen distinct sizes. */
const geoCache = new Map();
function cached(key, build) {
  let g = geoCache.get(key);
  if (!g) { g = build(); geoCache.set(key, g); }
  return g;
}

// ---------------------------------------------------------------------------
// bevelBox — the default box
// ---------------------------------------------------------------------------

/**
 * A box with broken edges. Built as an extruded rounded rectangle rather than a
 * true bevel modifier: cheaper, and at 6-20 mm the difference is not resolvable.
 *
 * @param {number} w,h,d  size in metres
 * @param {number} bevel  edge break in metres (default 12 mm, doctrine range 6-20)
 */
export function bevelBox(w, h, d, bevel = 0.012) {
  const b = Math.min(bevel, Math.min(w, h, d) * 0.24);
  const key = `bb|${w}|${h}|${d}|${b}`;
  return cached(key, () => {
    const shape = new THREE.Shape();
    const x = w / 2, y = h / 2;
    shape.moveTo(-x + b, -y);
    shape.lineTo(x - b, -y);
    shape.quadraticCurveTo(x, -y, x, -y + b);
    shape.lineTo(x, y - b);
    shape.quadraticCurveTo(x, y, x - b, y);
    shape.lineTo(-x + b, y);
    shape.quadraticCurveTo(-x, y, -x, y - b);
    shape.lineTo(-x, -y + b);
    shape.quadraticCurveTo(-x, -y, -x + b, -y);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: d - b * 2, bevelEnabled: true, bevelThickness: b,
      bevelSize: b, bevelSegments: 2, curveSegments: 2,
    });
    g.translate(0, 0, -(d - b * 2) / 2);
    g.computeVertexNormals();
    return g;
  });
}

// ---------------------------------------------------------------------------
// instanced repeaters
// ---------------------------------------------------------------------------

function instance(geo, material, placements) {
  const mesh = new THREE.InstancedMesh(geo, material, placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  placements.forEach((p, i) => {
    e.set(p.rot?.[0] || 0, p.rot?.[1] || 0, p.rot?.[2] || 0);
    q.setFromEuler(e);
    s.setScalar(p.scale ?? 1);
    m.compose(new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]), q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Domed bolt heads. Real M12 head ≈ 19 mm across, 8 mm proud. */
export function bolts(placements, material, radius = 0.0095) {
  const geo = cached(`bolt|${radius}`, () => {
    const g = new THREE.SphereGeometry(radius, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.52);
    g.scale(1, 0.85, 1);
    return g;
  });
  const m = instance(geo, material, placements);
  m.name = "Bolts";
  return m;
}

/** Flush rivets — flatter and smaller than bolts. */
export function rivets(placements, material, radius = 0.006) {
  const geo = cached(`rivet|${radius}`, () => {
    const g = new THREE.SphereGeometry(radius, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    g.scale(1, 0.55, 1);
    return g;
  });
  const m = instance(geo, material, placements);
  m.name = "Rivets";
  return m;
}

/**
 * A row of fasteners along a line — the usual case. Spacing is real: panel
 * fasteners sit 80-150 mm apart, so a 2 m seam carries 14-25 of them.
 */
export function fastenerRun(from, to, material, { spacing = 0.11, kind = "rivet", radius } = {}) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const n = Math.max(2, Math.round(len / spacing));
  const placements = [];
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    placements.push({ pos: [p.x, p.y, p.z] });
  }
  return kind === "bolt"
    ? bolts(placements, material, radius ?? 0.0095)
    : rivets(placements, material, radius ?? 0.006);
}

// ---------------------------------------------------------------------------
// linear details
// ---------------------------------------------------------------------------

/** A recessed panel seam. Depth is what makes it read — a painted line does not. */
export function seam(length, material, { width = 0.014, depth = 0.008 } = {}) {
  const mesh = new THREE.Mesh(bevelBox(length, width, depth, 0.003), material);
  mesh.name = "Seam";
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

/** A weld bead — proud, slightly irregular, catches light along its crown. */
export function weld(length, material, { radius = 0.009, segments = 24 } = {}) {
  const geo = cached(`weld|${length}|${radius}|${segments}`, () => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Gentle waver so it does not read as a pipe.
      pts.push(new THREE.Vector3((t - 0.5) * length, Math.sin(t * 22) * radius * 0.22, 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, radius, 6, false);
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = "Weld";
  mesh.castShadow = true;
  return mesh;
}

/** A butt hinge: two leaves and a knuckle. Real leaf ≈ 100 x 40 x 3 mm. */
export function hinge(material, { leaf = 0.1, height = 0.04, pin = 0.008 } = {}) {
  const g = new THREE.Group();
  g.name = "Hinge";
  for (const sx of [-1, 1]) {
    const l = new THREE.Mesh(bevelBox(leaf / 2, height, 0.003, 0.001), material);
    l.position.set((sx * leaf) / 4, 0, 0);
    l.castShadow = true;
    g.add(l);
  }
  const knuckleGeo = cached(`knuckle|${pin}|${height}`, () =>
    new THREE.CylinderGeometry(pin, pin, height * 1.15, 10));
  const k = new THREE.Mesh(knuckleGeo, material);
  k.rotation.z = Math.PI / 2;
  k.castShadow = true;
  g.add(k);
  return g;
}

/** A louvred vent. Slats are separate geometry, so they cast their own shadows. */
export function vent(w, h, material, { slats = 6, frame = 0.012 } = {}) {
  const g = new THREE.Group();
  g.name = "Vent";
  const surround = new THREE.Mesh(bevelBox(w, h, 0.02, 0.004), material);
  surround.castShadow = true; surround.receiveShadow = true;
  g.add(surround);
  const inner = h - frame * 2;
  for (let i = 0; i < slats; i++) {
    const s = new THREE.Mesh(bevelBox(w - frame * 2, inner / slats * 0.62, 0.016, 0.002), material);
    s.position.set(0, -inner / 2 + (i + 0.5) * (inner / slats), 0.012);
    s.rotation.x = -0.5;   // angled down, the way a real louvre sheds water
    s.castShadow = true;
    g.add(s);
  }
  return g;
}

/** A grab rail / handrail. Real diameter 32-40 mm, standoff 60-75 mm. */
export function handrail(length, material, { radius = 0.018, standoff = 0.07 } = {}) {
  const g = new THREE.Group();
  g.name = "Handrail";
  const barGeo = cached(`rail|${length}|${radius}`, () =>
    new THREE.CylinderGeometry(radius, radius, length, 10));
  const bar = new THREE.Mesh(barGeo, material);
  bar.rotation.z = Math.PI / 2;
  bar.position.z = standoff;
  bar.castShadow = true;
  g.add(bar);
  const legGeo = cached(`raillleg|${standoff}|${radius}`, () =>
    new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, standoff, 8));
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.rotation.x = Math.PI / 2;
    leg.position.set((sx * length) / 2 - sx * radius * 2, 0, standoff / 2);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

/** A ladder. Rungs at 300 mm is the real spacing and it is what sells scale. */
export function ladder(height, material, { width = 0.42, rungSpacing = 0.3, rail = 0.018, rung = 0.012 } = {}) {
  const g = new THREE.Group();
  g.name = "Ladder";
  const railGeo = cached(`ladrail|${height}|${rail}`, () =>
    new THREE.CylinderGeometry(rail, rail, height, 10));
  for (const sx of [-1, 1]) {
    const r = new THREE.Mesh(railGeo, material);
    r.position.set((sx * width) / 2, height / 2, 0);
    r.castShadow = true;
    g.add(r);
  }
  const n = Math.max(2, Math.floor(height / rungSpacing));
  const rungGeo = cached(`ladrung|${width}|${rung}`, () =>
    new THREE.CylinderGeometry(rung, rung, width, 8));
  const placements = [];
  for (let i = 1; i <= n; i++) {
    placements.push({ pos: [0, i * (height / (n + 1)), 0], rot: [0, 0, Math.PI / 2] });
  }
  const rungs = instance(rungGeo, material, placements);
  rungs.name = "LadderRungs";
  g.add(rungs);
  return g;
}
