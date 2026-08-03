// Asset template — copy this folder to assets/<name>/ and build from it.
//
// It exists to do three things:
//   1. show the minimum wiring for the shared kit
//   2. prove the kit actually loads and renders in this repo
//   3. give the harness something to screenshot on day one
//
// Everything that moves is pinnable from the URL, because two captures taken at
// different camera angles or sun positions cannot be compared:
//   ?cam=x,y,z,yaw,pitch   pin the camera
//   ?sun=elevation         pin the sun (radians)
//   ?inspect=1             show the grid, addresses and asset IDs
//   ?dev=1                 expose window.LAB
import * as THREE from "three";
import { surface, setTextureBase, surfaceReport } from "../../lib/v1/surface.js";
import { bevelBox, bolts, fastenerRun, seam, weld, hinge, vent, handrail, ladder } from "../../lib/v1/detail.js";
import { configureGrid, gridAddress, registerAsset, addressReport,
         lookAtAddress, buildInspectionLayer } from "../../lib/v1/address.js";

const qs = new URLSearchParams(location.search);
const num = (k, d) => { const v = parseFloat(qs.get(k)); return Number.isFinite(v) ? v : d; };

setTextureBase("../../textures/");
configureGrid({ module: 4, size: 48 });

// ---- renderer -------------------------------------------------------------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Tone mapping is not optional with physically-scaled lights.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb3bf);
scene.fog = new THREE.Fog(0x9fb3bf, 34, 96);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = "YXZ";

// ---- light rig (last in build order, but it has to exist to see anything) --
scene.add(new THREE.HemisphereLight(0xdfeef7, 0x4a4f45, 1.1));
const sun = new THREE.DirectionalLight(0xfff4e6, 2.0);
const sunElev = num("sun", 0.95);
sun.position.set(Math.cos(sunElev) * 22, Math.sin(sunElev) * 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const S = 18;
sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
sun.shadow.camera.top = S;  sun.shadow.camera.bottom = -S;
// Never leave these unset — without them a large flat surface shows acne.
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun);

// ---- ground ---------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(48, 48),
  surface("concrete", { tile: [2.2, 2.2], grime: 0.35, grimeHeight: 0.4, dust: 0.3 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---- the asset ------------------------------------------------------------
// Replace everything below with your own. It is here to exercise the kit.
const steel = surface("stone", { local: true, tile: [1.4, 1.4], grime: 0.4, grimeHeight: 0.8 });
const trim = new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.55, metalness: 0.35 });

const demo = new THREE.Group();
demo.name = "TemplateDemo";

// A bevelled slab — bevelBox, not BoxGeometry. Sharp 90 degree edges are a
// rendering artifact; a 12 mm break is what makes a form read as manufactured.
const W = 4, H = 2.4, D = 1.6;
const body = new THREE.Mesh(bevelBox(W, H, D, 0.014), steel);
body.position.y = H / 2;
body.castShadow = true; body.receiveShadow = true;
demo.add(body);

// Tertiary detail: panel seams, fastener runs, a weld, a vent, a hinge, rails.
const face = D / 2 + 0.002;
for (const y of [H * 0.34, H * 0.68]) {
  const s = seam(W * 0.92, trim);
  s.position.set(0, y, face);
  demo.add(s);
  const run = fastenerRun([-W * 0.44, y + 0.055, face], [W * 0.44, y + 0.055, face], trim, { spacing: 0.13 });
  demo.add(run);
}
const bead = weld(W * 0.92, trim);
bead.position.set(0, 0.02, face);
demo.add(bead);

const v = vent(0.7, 0.5, trim);
v.position.set(-W * 0.28, H * 0.5, face + 0.01);
demo.add(v);

const hg = hinge(trim);
hg.position.set(W * 0.34, H * 0.5, face + 0.01);
demo.add(hg);

const rail = handrail(1.2, trim);
rail.position.set(W * 0.18, 0.95, face);
demo.add(rail);

const lad = ladder(H, trim);
lad.position.set(-W / 2 - 0.28, 0, 0);
demo.add(lad);

const heads = bolts(
  [[-W * 0.45, H - 0.14], [W * 0.45, H - 0.14], [-W * 0.45, 0.14], [W * 0.45, 0.14]]
    .map(([x, y]) => ({ pos: [x, y, face] })),
  trim
);
demo.add(heads);

scene.add(demo);

// ---- addressing -----------------------------------------------------------
// Register anything worth naming. Then "AST-DEMOBODY-0001 at L0-H06-R06" is
// exact, and an AI can be told to go and look at it.
registerAsset(body, "demoBody");
registerAsset(v, "vent");
registerAsset(lad, "ladder");

let inspectionLayer = null;
if (qs.get("inspect") === "1") {
  inspectionLayer = buildInspectionLayer({ radius: 4 });
  scene.add(inspectionLayer);
}

// ---- camera ---------------------------------------------------------------
// Pinned if asked, otherwise a slow orbit so the thing can be looked at.
const camPin = (qs.get("cam") || "").split(",").map(parseFloat);
const pinned = camPin.length >= 3 && camPin.every(Number.isFinite);
let t = 0;
function placeCamera(dt) {
  if (pinned) {
    camera.position.set(camPin[0], camPin[1], camPin[2]);
    camera.rotation.set(camPin[4] || 0, camPin[3] || 0, 0);
    return;
  }
  t += dt * 0.16;
  const r = 8.5;
  camera.position.set(Math.sin(t) * r, 3.1, Math.cos(t) * r);
  camera.lookAt(0, 1.2, 0);
}

// ---- dev handle -----------------------------------------------------------
if (qs.get("dev") === "1" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  window.LAB = {
    THREE, scene, camera, renderer,
    surfaceReport, addressReport, gridAddress,
    /** Go and look at an address — the reverse direction that makes addressing pay. */
    goto(address, opts) { const r = lookAtAddress(camera, address, opts); camPin.length = 0; return r; },
    inspect(on = true) {
      if (!inspectionLayer) { inspectionLayer = buildInspectionLayer({ radius: 4 }); scene.add(inspectionLayer); }
      inspectionLayer.visible = on;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles,
               geometries: i.memory.geometries, textures: i.memory.textures };
    },
  };
  console.log("[LAB] dev handle ready — window.LAB");
}

// ---- loop -----------------------------------------------------------------
const hud = document.getElementById("hud");
const clock = new THREE.Clock();
let frames = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!pinned || frames === 0) placeCamera(dt);
  renderer.render(scene, camera);
  if (++frames % 20 === 0) {
    const i = renderer.info;
    hud.textContent =
      `draw calls  ${i.render.calls}\n` +
      `triangles   ${i.render.triangles.toLocaleString()}\n` +
      `address     ${gridAddress(camera.position.x, camera.position.z)}`;
  }
  requestAnimationFrame(tick);
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
tick();
