import * as THREE from "three";
import { mergeGeometries } from "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/utils/BufferGeometryUtils.js";
import {
  bevelBox,
  bolts,
  fastenerRun,
  handrail,
  hinge,
  ladder,
  rivets,
  seam,
  vent,
  weld,
} from "../../lib/v1/detail.js";
import { gridAddress, registerAsset } from "../../lib/v1/address.js";
import { CONFIG } from "./config.js";
import { componentGeometry, prismGeometry } from "./silhouettes.js";

const SHIP = CONFIG.ship;
const EPS = 1e-5;
const round = (value) => +value.toFixed(3);
const vec = (value) => value.toArray().map(round);

function addMesh(parent, geometry, material, name, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  if (position) mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, name, size, position, material, bevel = SHIP.exposedEdgeBevelMetres, rotation) {
  return addMesh(parent, bevelBox(...size, bevel), material, name, position, rotation);
}

function boardingCutMaterial(source, label) {
  const material = source.clone();
  material.name = `${source.name || "material"}-${label}-aperture`;
  material.stencilWrite = true;
  material.stencilWriteMask = 0x00;
  material.stencilFunc = THREE.NotEqualStencilFunc;
  material.stencilRef = 1;
  material.stencilFuncMask = 0xff;
  material.stencilFail = THREE.KeepStencilOp;
  material.stencilZFail = THREE.KeepStencilOp;
  material.stencilZPass = THREE.KeepStencilOp;
  return material;
}

function makeBoardingApertureMask() {
  const boarding = SHIP.boarding;
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    stencilWrite: true,
    stencilWriteMask: 0xff,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilRef: 1,
    stencilFuncMask: 0xff,
    stencilFail: THREE.ReplaceStencilOp,
    stencilZFail: THREE.ReplaceStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  material.name = "MAT-BOARDING-APERTURE-MASK";
  const mask = addMesh(
    new THREE.Group(),
    new THREE.PlaneGeometry(boarding.apertureWidthMetres, boarding.apertureHeightMetres),
    material,
    "AIRLOCK-BOARDING-APERTURE-MASK",
    boarding.apertureCenterMetres,
    [0, Math.PI / 2, 0],
  );
  mask.renderOrder = -100;
  mask.frustumCulled = false;
  mask.userData.interactionType = "boarding-aperture-mask";
  mask.userData.excludeFromMetrics = true;
  return mask;
}

function cylinderBetween(parent, name, start, end, radius, material, radialSegments = 10) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments);
  const mesh = addMesh(parent, geometry, material, name);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function countGeometry(root) {
  let meshes = 0;
  let triangles = 0;
  let instances = 0;
  root.traverse((object) => {
    if (!object.isMesh || object.userData.excludeFromMetrics) return;
    meshes += 1;
    if (object.isInstancedMesh) instances += object.count;
    const geometry = object.geometry;
    const perMesh = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    triangles += perMesh * (object.isInstancedMesh ? object.count : 1);
  });
  return { meshes, triangles: Math.round(triangles), instances };
}

function batchStaticMeshes(root, label, skipGroups = []) {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const buckets = new Map();
  const skip = new Set(skipGroups);

  const visit = (object) => {
    if (object !== root && (skip.has(object) || object.userData.interactionType)) return;
    for (const child of [...object.children]) visit(child);
    if (object.isMesh && !object.isInstancedMesh && !Array.isArray(object.material)) {
      let geometry = object.geometry.clone();
      geometry.applyMatrix4(rootInverse.clone().multiply(object.matrixWorld));
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      if (geometry.index) {
        const nonIndexed = geometry.toNonIndexed();
        geometry.dispose();
        geometry = nonIndexed;
      }
      for (const attribute of Object.keys(geometry.attributes)) {
        if (attribute !== "position" && attribute !== "normal") geometry.deleteAttribute(attribute);
      }
      const bucket = buckets.get(object.material) || { geometries: [], objects: [] };
      bucket.geometries.push(geometry);
      bucket.objects.push(object);
      buckets.set(object.material, bucket);
    }
  };
  visit(root);

  let batchIndex = 0;
  let mergedMeshes = 0;
  for (const [material, bucket] of buckets) {
    const merged = mergeGeometries(bucket.geometries, false);
    bucket.geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    for (const object of bucket.objects) object.parent?.remove(object);
    mergedMeshes += bucket.objects.length;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `${label}-Batch-${String(batchIndex++).padStart(2, "0")}-${material.name || "material"}`;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return { batches: batchIndex, mergedMeshes };
}

function makePrimaryHull(materials) {
  const root = new THREE.Group();
  root.name = "SHIP-B2-PrimaryHull";
  const cutawayHide = new THREE.Group();
  cutawayHide.name = "SHIP-B2-CutawayHide-Exterior";
  root.add(cutawayHide);

  const boardingShells = new Set(["starboard-pressure-boom", "starboard-airlock-blister"]);
  for (const component of SHIP.exteriorComponents) {
    const sourceMaterial = materials[component.material] || materials.hull;
    const material = boardingShells.has(component.name)
      ? boardingCutMaterial(sourceMaterial, component.name)
      : sourceMaterial;
    const parent = /starboard|dorsal-command/.test(component.name) ? cutawayHide : root;
    const mesh = addMesh(parent, componentGeometry(component), material, component.name);
    mesh.userData.primaryForm = true;
    mesh.userData.componentType = component.type;
  }

  // The cockpit glass is a real independent shell, not a colour painted onto
  // the pressure spine. Its broad forward plan is what makes the command deck
  // readable from the exterior.
  const canopy = addMesh(root, prismGeometry([
    [-1.92, 8.45], [1.92, 8.45], [1.35, 13.55], [0, 15.0], [-1.35, 13.55],
  ], 4.72, 5.78), materials.glass, "CockpitCanopyAssembly");
  canopy.renderOrder = 3;

  const boardingApertureMask = makeBoardingApertureMask();
  root.add(boardingApertureMask);

  return { root, cutawayHide, canopy, boardingApertureMask };
}

function makeEngine(spec, materials) {
  const group = new THREE.Group();
  group.name = spec.id;
  group.position.set(...spec.positionMetres);

  const length = spec.lengthMetres;
  const radius = spec.radiusMetres;
  addMesh(group,
    new THREE.CylinderGeometry(radius * 0.54, radius, length, 20, 2, true),
    materials.alloyDark,
    `${spec.id}-bell`,
    [0, 0, -length * 0.25],
    [Math.PI / 2, 0, 0]);
  addMesh(group,
    new THREE.CylinderGeometry(radius * 0.60, radius * 0.60, length * 0.42, 18),
    materials.alloy,
    `${spec.id}-throat`,
    [0, 0, length * 0.42],
    [Math.PI / 2, 0, 0]);
  for (const z of [-length * 0.72, -length * 0.2, length * 0.25]) {
    addMesh(group, new THREE.TorusGeometry(radius * (z < 0 ? 0.88 : 0.62), 0.085, 8, 24),
      materials.alloy, `${spec.id}-retaining-ring`, [0, 0, z]);
  }
  const inner = addMesh(group,
    new THREE.CircleGeometry(radius * 0.48, 20),
    materials.black,
    `${spec.id}-combustor`,
    [0, 0, -length * 0.78],
    [0, Math.PI, 0]);
  inner.renderOrder = 1;
  return group;
}

function makeLandingGear(spec, materials) {
  const group = new THREE.Group();
  group.name = spec.id;
  const [x, y, z] = spec.positionMetres;
  const foot = [x + spec.rakeXMetres, -0.34, z + 0.22];
  cylinderBetween(group, `${spec.id}-oleo`, [x, y + 0.88, z], foot, 0.09, materials.alloy, 12);
  cylinderBetween(group, `${spec.id}-brace`, [x - spec.rakeXMetres * 0.55, y + 0.72, z - 0.45], foot, 0.055, materials.alloyDark, 10);
  addBox(group, `${spec.id}-foot`, [0.78, 0.12, 0.58], [foot[0], foot[1] - 0.02, foot[2]], materials.rubber, 0.035);
  addBox(group, `${spec.id}-bay-door`, [0.72, 0.08, 1.0], [x, y + 0.92, z], materials.hullDark, 0.018, [0.22 * Math.sign(spec.rakeXMetres), 0, 0]);
  return group;
}

function makeTurret({ id, position, ventral = false, assisted = false }, materials) {
  const group = new THREE.Group();
  group.name = id;
  group.position.set(...position);
  if (ventral) group.rotation.z = Math.PI;
  addMesh(group, new THREE.CylinderGeometry(assisted ? 0.42 : 0.68, assisted ? 0.48 : 0.75, 0.28, 16),
    materials.alloyDark, `${id}-barbette`);
  addBox(group, `${id}-yoke`, [assisted ? 0.7 : 1.05, 0.34, 0.76], [0, 0.25, 0], materials.hullDark, 0.05);
  const barrelRadius = assisted ? 0.035 : 0.055;
  const barrelLength = assisted ? 1.65 : 2.2;
  for (const x of assisted ? [-0.16, 0.16] : [-0.22, 0.22]) {
    cylinderBetween(group, `${id}-barrel`, [x, 0.28, 0.1], [x, 0.28, barrelLength], barrelRadius, materials.alloy, 10);
  }
  group.userData.weaponMount = id;
  return group;
}

function makeExteriorSecondary(materials) {
  const root = new THREE.Group();
  root.name = "SHIP-B2-SecondaryExterior";
  const cutawayHide = new THREE.Group();
  cutawayHide.name = "SHIP-B2-CutawayHide-Secondary";
  root.add(cutawayHide);

  for (const spec of SHIP.engines) root.add(makeEngine(spec, materials));
  for (const spec of SHIP.landingGear) root.add(makeLandingGear(spec, materials));

  root.add(makeTurret({
    id: "WPN-CHIN-01", position: [0, 0.12, 9.8], assisted: true,
  }, materials));
  cutawayHide.add(makeTurret({
    id: "WPN-DORSAL-01", position: [7.15, 5.75, 0.75],
  }, materials));
  root.add(makeTurret({
    id: "WPN-VENTRAL-01", position: [0, -0.33, -6.35], ventral: true,
  }, materials));

  // Service-channel trunks make the split architecture functional. They run
  // exposed between the pressure spine and booms instead of being painted cues.
  for (const x of [-3.25, 3.35]) {
    cylinderBetween(root, "ServiceChannel-Coolant", [x, 1.35, -9.0], [x, 1.35, 5.6], 0.12, materials.alloyDark, 12);
    cylinderBetween(root, "ServiceChannel-Return", [x + Math.sign(x) * 0.28, 1.18, -8.6], [x + Math.sign(x) * 0.28, 1.18, 4.8], 0.07, materials.alloy, 10);
    for (const z of [-7.2, -3.6, 0, 3.6]) {
      addBox(root, "ServiceChannel-Bracket", [0.74, 0.12, 0.18], [x, 1.34, z], materials.alloy, 0.015);
    }
  }

  // Dorsal sensor mast reaches the declared 7.15 m hull height.
  cylinderBetween(root, "DorsalSensorMast", [0, 6.28, -1.1], [0, 7.05, -1.1], 0.055, materials.alloy, 10);
  addMesh(root, new THREE.SphereGeometry(0.16, 12, 8), materials.glass, "DorsalSensorHead", [0, 7.05, -1.1]);

  return { root, cutawayHide };
}

class SlidingDoorMechanism {
  constructor({ id, group, leaves, axis, travelMetres, seconds, initiallyOpen = true }) {
    this.id = id;
    this.group = group;
    this.leaves = leaves;
    this.axis = axis;
    this.travelMetres = travelMetres;
    this.seconds = seconds;
    this.closed = leaves.map((leaf) => leaf.position.clone());
    this.fraction = initiallyOpen ? 1 : 0;
    this.target = this.fraction;
    this.apply();
  }

  setOpen(open, instant = false) {
    this.target = open ? 1 : 0;
    if (instant) {
      this.fraction = this.target;
      this.apply();
    }
  }

  toggle() { this.setOpen(this.target < 0.5); }

  update(dt) {
    const delta = dt / Math.max(0.01, this.seconds);
    if (this.fraction < this.target) this.fraction = Math.min(this.target, this.fraction + delta);
    else if (this.fraction > this.target) this.fraction = Math.max(this.target, this.fraction - delta);
    this.apply();
  }

  apply() {
    this.leaves.forEach((leaf, index) => {
      leaf.position.copy(this.closed[index]);
      const sign = index === 0 ? -1 : 1;
      leaf.position[this.axis] += sign * this.travelMetres * this.fraction;
    });
  }

  report() {
    return { id: this.id, openFraction: round(this.fraction), targetOpen: this.target === 1 };
  }
}

class ElevatorMechanism {
  constructor(group, lowerY, upperY) {
    this.id = "ELEVATOR-01";
    this.group = group;
    this.lowerY = lowerY;
    this.upperY = upperY;
    this.seconds = SHIP.mechanisms.elevatorTravelSeconds;
    this.fraction = 0;
    this.target = 0;
    this.apply();
  }

  setDeck(deckId, instant = false) {
    this.target = deckId === "L2" ? 1 : 0;
    if (instant) {
      this.fraction = this.target;
      this.apply();
    }
  }

  toggle() { this.target = this.target < 0.5 ? 1 : 0; }

  update(dt) {
    const delta = dt / Math.max(0.01, this.seconds);
    if (this.fraction < this.target) this.fraction = Math.min(this.target, this.fraction + delta);
    else if (this.fraction > this.target) this.fraction = Math.max(this.target, this.fraction - delta);
    this.apply();
  }

  apply() {
    this.group.position.y = THREE.MathUtils.lerp(this.lowerY, this.upperY, this.fraction);
  }

  report() {
    return {
      id: this.id,
      openDeck: this.fraction < 0.5 ? "L1" : "L2",
      travelFraction: round(this.fraction),
      targetDeck: this.target < 0.5 ? "L1" : "L2",
    };
  }
}

function makeSlidingDoor({ id, center, axis, floorY, material, frameMaterial, initiallyOpen = true }) {
  const width = SHIP.circulation.hatchWidthMetres;
  const height = SHIP.circulation.hatchHeightMetres;
  const depth = 0.07;
  const group = new THREE.Group();
  group.name = id;
  group.position.set(center[0], floorY, center[1]);
  const wallRunsX = axis === "x";

  if (wallRunsX) {
    addBox(group, `${id}-jamb`, [0.075, height + 0.08, 0.13], [-width / 2 - 0.04, height / 2, 0], frameMaterial, 0.01);
    addBox(group, `${id}-jamb`, [0.075, height + 0.08, 0.13], [width / 2 + 0.04, height / 2, 0], frameMaterial, 0.01);
    addBox(group, `${id}-header`, [width + 0.16, 0.09, 0.13], [0, height + 0.035, 0], frameMaterial, 0.01);
  } else {
    addBox(group, `${id}-jamb`, [0.13, height + 0.08, 0.075], [0, height / 2, -width / 2 - 0.04], frameMaterial, 0.01);
    addBox(group, `${id}-jamb`, [0.13, height + 0.08, 0.075], [0, height / 2, width / 2 + 0.04], frameMaterial, 0.01);
    addBox(group, `${id}-header`, [0.13, 0.09, width + 0.16], [0, height + 0.035, 0], frameMaterial, 0.01);
  }

  const leafSize = wallRunsX
    ? [width * 0.48, height - 0.07, depth]
    : [depth, height - 0.07, width * 0.48];
  const leaves = [];
  for (const sign of [-1, 1]) {
    const position = wallRunsX
      ? [sign * width * 0.245, height * 0.5, 0]
      : [0, height * 0.5, sign * width * 0.245];
    const leaf = addBox(group, `${id}-leaf`, leafSize, position, material, 0.018);
    addBox(leaf, `${id}-leaf-inset`, wallRunsX ? [leafSize[0] * 0.68, 0.42, 0.018] : [0.018, 0.42, leafSize[2] * 0.68],
      wallRunsX ? [0, 0.12, depth * 0.58] : [depth * 0.58, 0.12, 0], frameMaterial, 0.004);
    leaves.push(leaf);
  }
  group.userData.interactionType = "door";
  group.userData.interactionId = id;
  return {
    group,
    mechanism: new SlidingDoorMechanism({
      id, group, leaves, axis: wallRunsX ? "x" : "z",
      travelMetres: width * 0.52,
      seconds: SHIP.mechanisms.interiorDoorSeconds,
      initiallyOpen,
    }),
  };
}

function addWallX(parent, name, xMin, xMax, z, floorY, ceilingY, material, opening) {
  const thickness = SHIP.shellThicknessMetres;
  const height = ceilingY - floorY;
  if (!opening) {
    addBox(parent, name, [xMax - xMin, height, thickness], [(xMin + xMax) / 2, floorY + height / 2, z], material);
    return;
  }
  const half = SHIP.circulation.hatchWidthMetres / 2;
  const left = opening.center - half;
  const right = opening.center + half;
  if (left - xMin > EPS) addBox(parent, name, [left - xMin, height, thickness], [(xMin + left) / 2, floorY + height / 2, z], material);
  if (xMax - right > EPS) addBox(parent, name, [xMax - right, height, thickness], [(right + xMax) / 2, floorY + height / 2, z], material);
  const headerHeight = Math.max(0.08, height - SHIP.circulation.hatchHeightMetres);
  addBox(parent, `${name}-header`, [SHIP.circulation.hatchWidthMetres, headerHeight, thickness],
    [opening.center, ceilingY - headerHeight / 2, z], material);
}

function addWallZ(parent, name, zMin, zMax, x, floorY, ceilingY, material, opening) {
  const thickness = SHIP.shellThicknessMetres;
  const height = ceilingY - floorY;
  if (!opening) {
    addBox(parent, name, [thickness, height, zMax - zMin], [x, floorY + height / 2, (zMin + zMax) / 2], material);
    return;
  }
  const half = SHIP.circulation.hatchWidthMetres / 2;
  const lower = opening.center - half;
  const upper = opening.center + half;
  if (lower - zMin > EPS) addBox(parent, name, [thickness, height, lower - zMin], [x, floorY + height / 2, (zMin + lower) / 2], material);
  if (zMax - upper > EPS) addBox(parent, name, [thickness, height, zMax - upper], [x, floorY + height / 2, (upper + zMax) / 2], material);
  const headerHeight = Math.max(0.08, height - SHIP.circulation.hatchHeightMetres);
  addBox(parent, `${name}-header`, [thickness, headerHeight, SHIP.circulation.hatchWidthMetres],
    [x, ceilingY - headerHeight / 2, opening.center], material);
}

function makeRoomShell(room, deck, groups, materials, doors) {
  const [xMin, xMax, zMin, zMax] = room.bounds;
  const width = xMax - xMin;
  const depth = zMax - zMin;
  const floorY = deck.floorYMetres;
  const ceilingY = deck.ceilingYMetres;
  const roomRoot = new THREE.Group();
  roomRoot.name = room.id;
  groups.interior.add(roomRoot);

  addBox(roomRoot, `${room.id}-floor-structure`, [width, 0.12, depth],
    [(xMin + xMax) / 2, floorY - 0.06, (zMin + zMax) / 2], materials.alloyDark, 0.008);
  addBox(roomRoot, `${room.id}-floor-finish`, [width - 0.12, 0.035, depth - 0.12],
    [(xMin + xMax) / 2, floorY + 0.018, (zMin + zMax) / 2], materials[room.floor], 0.006);
  addBox(groups.interiorCeilings, `${room.id}-ceiling`, [width, 0.10, depth],
    [(xMin + xMax) / 2, ceilingY + 0.05, (zMin + zMax) / 2], materials.interiorDark, 0.008);

  if (room.entrance.wall !== "none") {
    const opening = { center: room.entrance.centerMetres };
    const boardingOpening = room.id === "ROOM-L1-AIRLOCK"
      ? { center: SHIP.boarding.apertureCenterMetres[2] }
      : null;
    addWallX(roomRoot, `${room.id}-south-wall`, xMin, xMax, zMin, floorY, ceilingY, materials.interior,
      room.entrance.wall === "south" ? opening : null);
    addWallX(groups.interiorCutawayHide, `${room.id}-north-wall`, xMin, xMax, zMax, floorY, ceilingY,
      room.id === "ROOM-L2-COCKPIT" ? materials.glass : materials.interior,
      room.entrance.wall === "north" ? opening : null);
    addWallZ(roomRoot, `${room.id}-west-wall`, zMin, zMax, xMin, floorY, ceilingY, materials.interior,
      room.entrance.wall === "west" ? opening : null);
    addWallZ(groups.interiorCutawayHide, `${room.id}-east-wall`, zMin, zMax, xMax, floorY, ceilingY, materials.interior,
      room.entrance.wall === "east" ? opening : boardingOpening);

    const axis = /north|south/.test(room.entrance.wall) ? "x" : "z";
    let center;
    if (room.entrance.wall === "south") center = [room.entrance.centerMetres, zMin];
    else if (room.entrance.wall === "north") center = [room.entrance.centerMetres, zMax];
    else if (room.entrance.wall === "west") center = [xMin, room.entrance.centerMetres];
    else center = [xMax, room.entrance.centerMetres];
    const door = makeSlidingDoor({
      id: `DOOR-${room.id}`,
      center,
      axis,
      floorY,
      material: materials.accent,
      frameMaterial: materials.alloy,
      initiallyOpen: true,
    });
    roomRoot.add(door.group);
    doors.push(door.mechanism);
  }

  // Emissive lens geometry is part of the material/readability pass; it does
  // not add a light source or shadow rig.
  const lightCount = Math.max(1, Math.floor(depth / 3.2));
  for (let i = 0; i < lightCount; i++) {
    const z = THREE.MathUtils.lerp(zMin + 0.8, zMax - 0.8, lightCount === 1 ? 0.5 : i / (lightCount - 1));
    addBox(groups.interiorCeilings, `${room.id}-utility-lens`, [Math.min(1.0, width * 0.35), 0.035, 0.16],
      [(xMin + xMax) / 2, ceilingY - 0.015, z], materials.light, 0.008);
  }

  return roomRoot;
}

function makeInstancedBoxes(parent, name, size, placements, material, bevel = 0.006) {
  const geometry = bevelBox(...size, bevel);
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  placements.forEach((placement, index) => {
    quaternion.setFromEuler(new THREE.Euler(...(placement.rotation || [0, 0, 0])));
    matrix.compose(new THREE.Vector3(...placement.position), quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeSeat(station, materials) {
  const group = new THREE.Group();
  group.name = station.id;
  group.position.set(...station.positionMetres);
  group.rotation.y = station.yawRadians;
  addMesh(group, new THREE.CylinderGeometry(0.17, 0.22, 0.18, 12), materials.alloyDark, `${station.id}-pedestal`, [0, 0.08, 0]);
  addBox(group, `${station.id}-pan`, [0.62, 0.13, 0.64], [0, 0.46, 0.02], materials.rubber, 0.045);
  addBox(group, `${station.id}-back`, [0.62, 0.85, 0.13], [0, 0.87, -0.28], materials.rubber, 0.06, [-0.12, 0, 0]);
  addBox(group, `${station.id}-headrest`, [0.42, 0.22, 0.16], [0, 1.32, -0.35], materials.rubber, 0.05, [-0.08, 0, 0]);
  for (const x of [-0.38, 0.38]) {
    addBox(group, `${station.id}-arm`, [0.10, 0.10, 0.52], [x, 0.69, 0.02], materials.alloy, 0.025);
  }
  // Four-point harness straps are geometry, not painted marks.
  for (const x of [-0.15, 0.15]) {
    addBox(group, `${station.id}-harness-shoulder`, [0.045, 0.72, 0.025], [x, 0.97, -0.205], materials.accent, 0.008, [0, 0, x * 0.25]);
    addBox(group, `${station.id}-harness-lap`, [0.045, 0.46, 0.025], [x, 0.54, -0.02], materials.accent, 0.008, [Math.PI / 2, 0, x * 0.4]);
  }
  group.userData.interactionType = "station";
  group.userData.interactionId = station.id;
  group.userData.station = station;
  return group;
}

function makeConsole(parent, name, position, size, yaw, materials, screenCount = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  group.rotation.y = yaw;
  parent.add(group);
  addBox(group, `${name}-body`, size, [0, size[1] / 2, 0], materials.interiorDark, 0.035, [-0.18, 0, 0]);

  const usableWidth = size[0] * 0.82;
  const screenWidth = Math.min(0.62, usableWidth / Math.max(1, screenCount));
  const screenHeight = Math.min(0.42, size[1] * 0.48);
  for (let i = 0; i < screenCount; i++) {
    const x = screenCount === 1 ? 0 : THREE.MathUtils.lerp(-usableWidth / 2 + screenWidth / 2, usableWidth / 2 - screenWidth / 2, i / (screenCount - 1));
    const y = size[1] * 0.68;
    const z = -size[2] / 2 - 0.095;
    addBox(group, `${name}-screen-bezel`, [screenWidth + 0.055, screenHeight + 0.055, 0.032],
      [x, y, z + 0.018], materials.black, 0.009, [-0.18, 0, 0]);
    addBox(group, `${name}-screen`, [screenWidth, screenHeight, 0.018],
      [x, y, z], i % 2 ? materials.screenAmber : materials.screen, 0.006, [-0.18, 0, 0]);
    for (let row = -1; row <= 1; row++) {
      addBox(group, `${name}-screen-data`, [screenWidth * (row === 0 ? 0.62 : 0.42), 0.018, 0.008],
        [x - screenWidth * 0.11, y + row * screenHeight * 0.22, z - 0.015], materials.black, 0.003, [-0.18, 0, 0]);
      addBox(group, `${name}-screen-indicator`, [0.028, 0.028, 0.008],
        [x + screenWidth * 0.34, y + row * screenHeight * 0.22, z - 0.016], materials.light, 0.004, [-0.18, 0, 0]);
    }
  }
  return group;
}

function makeSwitchBank(parent, name, origin, columns, rows, spacing, materials, rotation = [0, 0, 0]) {
  const placements = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      placements.push({
        position: [
          origin[0] + (column - (columns - 1) / 2) * spacing,
          origin[1] + row * spacing,
          origin[2],
        ],
        rotation,
      });
    }
  }
  return makeInstancedBoxes(parent, name, [0.026, 0.018, 0.018], placements, materials.screenAmber, 0.004);
}

function corridorOpenings(deck, side) {
  const openings = [];
  for (const room of deck.rooms) {
    if (side === "port" && room.entrance.wall === "east") openings.push(room.entrance.centerMetres);
    if (side === "starboard" && room.entrance.wall === "west") openings.push(room.entrance.centerMetres);
  }
  if (deck.id === "L2") openings.push(0);
  return openings;
}

function makeCorridor(deck, groups, materials) {
  const corridor = deck.corridor;
  const width = corridor.xMax - corridor.xMin;
  const length = corridor.zMax - corridor.zMin;
  const centerZ = (corridor.zMin + corridor.zMax) / 2;
  addBox(groups.interior, `${deck.id}-corridor-structure`, [width + 0.18, 0.12, length],
    [0, deck.floorYMetres - 0.06, centerZ], materials.alloyDark, 0.008);
  addBox(groups.interior, `${deck.id}-corridor-tread`, [width, 0.035, length - 0.08],
    [0, deck.floorYMetres + 0.018, centerZ], materials.tread, 0.006);
  addBox(groups.interiorCeilings, `${deck.id}-corridor-ceiling`, [width + 0.32, 0.10, length],
    [0, deck.ceilingYMetres + 0.05, centerZ], materials.interiorDark, 0.008);

  const segment = 1.18;
  const count = Math.ceil(length / segment);
  for (const side of ["port", "starboard"]) {
    const x = side === "port" ? corridor.xMin - 0.07 : corridor.xMax + 0.07;
    const openings = corridorOpenings(deck, side);
    for (let i = 0; i < count; i++) {
      const z0 = corridor.zMin + i * length / count;
      const z1 = corridor.zMin + (i + 1) * length / count;
      const z = (z0 + z1) / 2;
      if (openings.some((opening) => Math.abs(z - opening) < 0.68)) continue;
      addBox(groups.interior, `${deck.id}-${side}-corridor-panel`, [0.10, 1.98, z1 - z0 - 0.035],
        [x, deck.floorYMetres + 1.08, z], materials.interior, 0.012);
      addBox(groups.interior, `${deck.id}-${side}-corridor-kick`, [0.115, 0.32, z1 - z0 - 0.06],
        [x + (side === "port" ? 0.006 : -0.006), deck.floorYMetres + 0.18, z],
        i % 4 === 1 ? materials.accent : materials.interiorDark, 0.008);
    }
  }

  for (const x of [-0.38, 0.38]) {
    cylinderBetween(groups.interiorCeilings, `${deck.id}-overhead-conduit`,
      [x, deck.ceilingYMetres - 0.14, corridor.zMin + 0.25],
      [x, deck.ceilingYMetres - 0.14, corridor.zMax - 0.25], 0.035, materials.alloy, 10);
  }
  for (let z = corridor.zMin + 1.0; z < corridor.zMax; z += 2.8) {
    addBox(groups.interiorCeilings, `${deck.id}-corridor-light`, [0.58, 0.035, 0.14],
      [0, deck.ceilingYMetres - 0.01, z], materials.light, 0.008);
  }
}

function makeRoomConnector(room, deck, groups, materials, navZones) {
  if (!/east|west/.test(room.entrance.wall)) return;
  const [xMin, xMax] = room.bounds;
  const corridor = deck.corridor;
  const roomEdge = room.entrance.wall === "east" ? xMax : xMin;
  const corridorEdge = room.entrance.wall === "east" ? corridor.xMin : corridor.xMax;
  const x0 = Math.min(roomEdge, corridorEdge);
  const x1 = Math.max(roomEdge, corridorEdge);
  const z = room.entrance.centerMetres;
  const depth = 1.04;
  const length = x1 - x0;
  if (length < 0.05) return;
  addBox(groups.interior, `${room.id}-connector-floor`, [length, 0.12, depth],
    [(x0 + x1) / 2, deck.floorYMetres - 0.06, z], materials.alloyDark, 0.008);
  addBox(groups.interior, `${room.id}-connector-finish`, [length, 0.035, depth - 0.08],
    [(x0 + x1) / 2, deck.floorYMetres + 0.018, z], materials.tread, 0.006);
  addBox(groups.interiorCeilings, `${room.id}-connector-ceiling`, [length, 0.10, depth],
    [(x0 + x1) / 2, deck.ceilingYMetres + 0.05, z], materials.interiorDark, 0.008);
  for (const sign of [-1, 1]) {
    addBox(groups.interior, `${room.id}-connector-wall`, [length, 1.98, 0.10],
      [(x0 + x1) / 2, deck.floorYMetres + 1.08, z + sign * depth / 2], materials.interior, 0.012);
  }
  navZones[deck.id].push({
    id: `NAV-${room.id}-CONNECTOR`, xMin: x0, xMax: x1,
    zMin: z - depth / 2, zMax: z + depth / 2,
  });
}

function makeVerticalTransfers(groups, materials, navZones) {
  const lower = SHIP.decks.find((deck) => deck.id === "L1");
  const upper = SHIP.decks.find((deck) => deck.id === "L2");
  const z = SHIP.mechanisms.verticalTransferZMetres;
  const ladderX = SHIP.mechanisms.ladderXMetres;
  const elevatorX = SHIP.mechanisms.elevatorXMetres;

  for (const deck of [lower, upper]) {
    addBox(groups.interior, `${deck.id}-ladder-landing`, [0.92, 0.12, 1.05],
      [ladderX, deck.floorYMetres - 0.06, z], materials.alloyDark, 0.008);
    addBox(groups.interior, `${deck.id}-elevator-landing`, [1.18, 0.12, 1.35],
      [elevatorX, deck.floorYMetres - 0.06, z], materials.alloyDark, 0.008);
    const corridor = deck.corridor;
    const ladderBridgeMin = ladderX - 0.48;
    const ladderBridgeMax = corridor.xMin;
    addBox(groups.interior, `${deck.id}-ladder-bridge`, [ladderBridgeMax - ladderBridgeMin, 0.12, 1.05],
      [(ladderBridgeMin + ladderBridgeMax) / 2, deck.floorYMetres - 0.06, z], materials.tread, 0.008);
    const elevatorBridgeMin = corridor.xMax;
    const elevatorBridgeMax = elevatorX + 0.58;
    addBox(groups.interior, `${deck.id}-elevator-bridge`, [elevatorBridgeMax - elevatorBridgeMin, 0.12, 1.35],
      [(elevatorBridgeMin + elevatorBridgeMax) / 2, deck.floorYMetres - 0.06, z], materials.tread, 0.008);
    navZones[deck.id].push({ id: `NAV-${deck.id}-LADDER`, xMin: ladderX - 0.48, xMax: ladderX + 0.48, zMin: z - 0.55, zMax: z + 0.55 });
    navZones[deck.id].push({ id: `NAV-${deck.id}-ELEVATOR`, xMin: elevatorX - 0.58, xMax: elevatorX + 0.58, zMin: z - 0.68, zMax: z + 0.68 });
    navZones[deck.id].push({ id: `NAV-${deck.id}-LADDER-BRIDGE`, xMin: ladderBridgeMin, xMax: ladderBridgeMax, zMin: z - 0.525, zMax: z + 0.525 });
    navZones[deck.id].push({ id: `NAV-${deck.id}-ELEVATOR-BRIDGE`, xMin: elevatorBridgeMin, xMax: elevatorBridgeMax, zMin: z - 0.675, zMax: z + 0.675 });
  }

  const ladderGroup = ladder(
    upper.floorYMetres - lower.floorYMetres,
    materials.alloy,
    {
      width: SHIP.circulation.ladderWidthMetres,
      rungSpacing: SHIP.circulation.ladderRungSpacingMetres,
    },
  );
  ladderGroup.name = "LADDER-01";
  ladderGroup.position.set(ladderX, lower.floorYMetres, z - 0.32);
  ladderGroup.userData.interactionType = "vertical-transfer";
  ladderGroup.userData.interactionId = "LADDER-01";
  groups.interior.add(ladderGroup);

  for (const x of [elevatorX - 0.68, elevatorX + 0.68]) {
    for (const zz of [z - 0.78, z + 0.78]) {
      cylinderBetween(groups.interior, "ElevatorShaftPost", [x, lower.floorYMetres, zz], [x, upper.ceilingYMetres, zz], 0.035, materials.alloy, 10);
    }
  }
  const cabin = new THREE.Group();
  cabin.name = "ELEVATOR-01-CABIN";
  cabin.position.set(elevatorX, lower.floorYMetres, z);
  const [cabW, cabH, cabD] = SHIP.circulation.elevatorCabinMetres;
  addBox(cabin, "ElevatorFloor", [cabW, 0.10, cabD], [0, 0.05, 0], materials.tread, 0.008);
  addBox(cabin, "ElevatorBack", [cabW, cabH, 0.08], [0, cabH / 2, -cabD / 2], materials.interiorDark, 0.012);
  for (const x of [-cabW / 2, cabW / 2]) {
    cylinderBetween(cabin, "ElevatorGrab", [x * 0.78, 0.62, -cabD * 0.38], [x * 0.78, 1.42, -cabD * 0.38], 0.018, materials.alloy, 10);
  }
  cabin.userData.interactionType = "vertical-transfer";
  cabin.userData.interactionId = "ELEVATOR-01";
  groups.interior.add(cabin);

  return {
    ladder: ladderGroup,
    elevator: new ElevatorMechanism(cabin, lower.floorYMetres, upper.floorYMetres),
  };
}

function furnishCockpit(root, deck, materials) {
  const floorY = deck.floorYMetres;
  makeConsole(root, "Cockpit-CentreConsole", [0, floorY, 11.15], [2.15, 1.12, 0.72], 0, materials, 3);
  makeConsole(root, "Cockpit-PortConsole", [-1.58, floorY, 10.72], [1.15, 0.92, 0.72], -0.20, materials, 2);
  makeConsole(root, "Cockpit-StarboardConsole", [1.58, floorY, 10.72], [1.15, 0.92, 0.72], 0.20, materials, 2);
  makeConsole(root, "Cockpit-NavigationConsole", [-1.25, floorY, 8.85], [0.82, 0.68, 0.48], 0, materials, 1);

  // Physical flight controls remain reachable from the pilot seat.
  cylinderBetween(root, "Pilot-ControlStick", [0.34, floorY + 0.42, 9.12], [0.34, floorY + 0.82, 9.16], 0.026, materials.alloy, 10);
  addBox(root, "Pilot-ControlGrip", [0.12, 0.08, 0.17], [0.34, floorY + 0.86, 9.2], materials.rubber, 0.025);
  cylinderBetween(root, "Pilot-Throttle", [-0.38, floorY + 0.47, 9.05], [-0.38, floorY + 0.70, 9.18], 0.022, materials.alloy, 10);
  addBox(root, "Pilot-ThrottleGrip", [0.10, 0.08, 0.16], [-0.38, floorY + 0.74, 9.21], materials.rubber, 0.022);

  makeSwitchBank(root, "Cockpit-CentreSwitchBank", [0, floorY + 0.78, 11.54], 8, 3, 0.075, materials, [-0.18, 0, 0]);
  makeSwitchBank(root, "Cockpit-OverheadSwitchBank", [0, deck.ceilingYMetres - 0.32, 9.5], 9, 4, 0.073, materials, [Math.PI / 2, 0, 0]);
  addBox(root, "Cockpit-OverheadPanel", [1.55, 0.11, 1.05], [0, deck.ceilingYMetres - 0.23, 9.6], materials.interiorDark, 0.025);

  for (const x of [-1.78, 1.78]) {
    const rail = handrail(1.25, materials.alloy, { radius: 0.018, standoff: 0.065 });
    rail.name = "Cockpit-GrabHandle";
    rail.position.set(x, floorY + 1.45, 9.6);
    rail.rotation.z = Math.PI / 2;
    root.add(rail);
  }

  // Canopy frames establish real pane boundaries and a strong forward view.
  for (const x of [-1.78, 0, 1.78]) {
    cylinderBetween(root, "Cockpit-CanopyFrame", [x * 0.72, floorY + 1.0, 10.5], [x, deck.ceilingYMetres - 0.08, 13.0], 0.035, materials.alloy, 10);
  }
}

function furnishCargo(root, deck, materials) {
  const y = deck.floorYMetres;
  const crates = [
    [-7.8, 0.48, -6.6, 1.35, 0.9, 1.05], [-5.9, 0.38, -6.75, 1.15, 0.7, 0.92],
    [-8.0, 0.58, -4.9, 1.2, 1.1, 1.0], [-5.2, 0.45, -4.7, 1.4, 0.84, 1.1],
    [-7.5, 0.38, -1.2, 1.0, 0.7, 0.86], [-5.5, 0.52, -0.8, 1.25, 1.0, 0.95],
  ];
  for (const [x, yy, z, w, h, d] of crates) {
    addBox(root, "Cargo-Crate", [w, h, d], [x, y + yy, z], materials.hullDark, 0.035);
    const strap = addBox(root, "Cargo-Crate-Strap", [0.075, h + 0.025, d + 0.035], [x, y + yy, z], materials.accent, 0.01);
    strap.userData.tertiaryDetail = true;
  }
  for (const x of [-8.7, -3.0]) {
    cylinderBetween(root, "Cargo-TieRail", [x, y + 0.06, -7.25], [x, y + 0.06, 0.55], 0.018, materials.alloy, 8);
  }
  const cargoRail = handrail(3.6, materials.alloy, { radius: 0.018, standoff: 0.07 });
  cargoRail.name = "Cargo-GrabRail";
  cargoRail.position.set(-9.05, y + SHIP.circulation.handrailHeightMetres, -3.3);
  cargoRail.rotation.y = Math.PI / 2;
  root.add(cargoRail);
}

function furnishCrewGalley(root, deck, materials) {
  const y = deck.floorYMetres;
  for (const z of [-0.9, 0.2, 1.3, 2.4, 3.5]) {
    addBox(root, "Galley-LowerCabinet", [0.72, 0.82, 0.92], [8.48, y + 0.42, z], materials.interior, 0.025);
    addBox(root, "Galley-UpperCabinet", [0.65, 0.72, 0.92], [8.55, y + 1.64, z], materials.interiorDark, 0.025);
    addBox(root, "Galley-CabinetHandle", [0.035, 0.20, 0.035], [8.08, y + 0.48, z], materials.alloy, 0.006);
  }
  addBox(root, "Galley-Counter", [0.94, 0.10, 5.35], [8.1, y + 0.90, 1.3], materials.alloy, 0.02);
  addBox(root, "Galley-Table", [1.25, 0.10, 1.65], [5.0, y + 0.78, 2.8], materials.interiorDark, 0.025);
  cylinderBetween(root, "Galley-TableLeg", [5.0, y + 0.08, 2.8], [5.0, y + 0.76, 2.8], 0.045, materials.alloy, 10);
  for (const z of [2.1, 3.5]) {
    addMesh(root, new THREE.CylinderGeometry(0.26, 0.32, 0.42, 12), materials.rubber, "Galley-Stool", [3.95, y + 0.22, z]);
  }
}

function furnishPortCabin(root, deck, materials) {
  const y = deck.floorYMetres;
  for (const z of [-2.5, 0.7]) {
    addBox(root, "Crew-BunkBase", [2.0, 0.18, 0.84], [-7.75, y + 0.48, z], materials.alloyDark, 0.035);
    addBox(root, "Crew-BunkPad", [1.9, 0.16, 0.76], [-7.75, y + 0.62, z], materials.rubber, 0.05);
    addBox(root, "Crew-BunkUpperBase", [2.0, 0.18, 0.84], [-7.75, y + 1.38, z], materials.alloyDark, 0.035);
    addBox(root, "Crew-BunkUpperPad", [1.9, 0.16, 0.76], [-7.75, y + 1.52, z], materials.rubber, 0.05);
  }
  for (const z of [-3.0, -2.2, -1.4, -0.6, 0.2, 1.0, 1.8]) {
    addBox(root, "Crew-Locker", [0.72, 1.75, 0.70], [-3.45, y + 0.89, z], materials.interior, 0.024);
    const lockerVent = vent(0.38, 0.22, materials.alloyDark, { slats: 4, frame: 0.01 });
    lockerVent.name = "Crew-LockerVent";
    lockerVent.position.set(-3.82, y + 1.45, z);
    lockerVent.rotation.y = -Math.PI / 2;
    root.add(lockerVent);
  }
}

function furnishEngineering(root, deck, materials) {
  const y = deck.floorYMetres;
  const core = new THREE.Group();
  core.name = "Engineering-MainCore";
  core.position.set(0, y, -11.1);
  addMesh(core, new THREE.CylinderGeometry(1.05, 1.15, 1.72, 20), materials.alloyDark, "Engineering-CoreCasing", [0, 0.9, 0]);
  for (const yy of [0.2, 0.78, 1.36, 1.72]) {
    addMesh(core, new THREE.TorusGeometry(1.12, 0.06, 8, 24), materials.alloy, "Engineering-CoreRing", [0, yy, 0], [Math.PI / 2, 0, 0]);
  }
  addBox(core, "Engineering-CoreReadout", [0.62, 0.38, 0.05], [0, 1.05, 1.10], materials.screen, 0.012);
  root.add(core);
  for (const x of [-2.9, 2.9]) {
    cylinderBetween(root, "Engineering-PrimaryLine", [x, y + 0.42, -13.25], [x, y + 1.45, -9.0], 0.11, materials.alloyDark, 12);
    cylinderBetween(root, "Engineering-SecondaryLine", [x + Math.sign(x) * 0.28, y + 0.38, -13.1], [x + Math.sign(x) * 0.28, y + 1.28, -9.2], 0.055, materials.alloy, 10);
  }
  makeConsole(root, "Engineering-ControlConsole", [2.2, y, -9.3], [1.4, 0.94, 0.62], Math.PI, materials, 2);
  for (const x of [-3.75, 3.75]) {
    const engineVent = vent(1.1, 0.72, materials.alloyDark, { slats: 8, frame: 0.018 });
    engineVent.name = "Engineering-HeatExchanger";
    engineVent.position.set(x, y + 1.25, -11.1);
    engineVent.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(engineVent);
  }
}

function furnishGunnery(root, deck, station, materials) {
  const facing = station.id === "STN-DORSAL" ? -Math.PI / 2 : Math.PI;
  const offset = station.id === "STN-DORSAL" ? [-0.95, 0, 0] : [0, 0, -1.0];
  makeConsole(root, `${station.id}-FireControl`, [
    station.positionMetres[0] + offset[0], deck.floorYMetres,
    station.positionMetres[2] + offset[2],
  ], [1.15, 0.92, 0.62], facing, materials, 2);
  makeSwitchBank(root, `${station.id}-WeaponSelectors`, [
    station.positionMetres[0] + offset[0], deck.floorYMetres + 0.72,
    station.positionMetres[2] + offset[2] + (station.id === "STN-DORSAL" ? 0 : 0.34),
  ], 5, 2, 0.075, materials);
}

function furnishAirlock(root, boardingRoot, deck, materials, doors) {
  const floorY = deck.floorYMetres;
  const outer = makeSlidingDoor({
    id: "DOOR-AIRLOCK-OUTER",
    center: [SHIP.boarding.outerDoorPositionMetres[0], SHIP.boarding.outerDoorPositionMetres[2]],
    axis: "z",
    floorY,
    material: materials.accent,
    frameMaterial: materials.alloy,
    initiallyOpen: false,
  });
  outer.mechanism.seconds = SHIP.mechanisms.airlockDoorSeconds;
  boardingRoot.add(outer.group);
  doors.push(outer.mechanism);
  for (const z of [-3.7, -2.4]) {
    const rail = handrail(0.72, materials.alloy, { radius: 0.018, standoff: 0.06 });
    rail.name = "Airlock-GrabHandle";
    rail.position.set(10.42, floorY + SHIP.circulation.handrailHeightMetres, z);
    rail.rotation.z = Math.PI / 2;
    root.add(rail);
  }
  addBox(root, "Airlock-CyclePanel", [0.05, 0.38, 0.24], [10.42, floorY + 1.22, -2.2], materials.screenAmber, 0.01);
}

function makeCrewFigure(materials) {
  const group = new THREE.Group();
  group.name = "CREW-REFERENCE-1P80";
  const footY = -0.34;
  group.position.set(11.72, footY, -3.05);
  const limb = materials.interiorDark;
  cylinderBetween(group, "Crew-Leg", [-0.12, 0, 0], [-0.12, 0.78, 0], 0.065, limb, 10);
  cylinderBetween(group, "Crew-Leg", [0.12, 0, 0], [0.12, 0.78, 0], 0.065, limb, 10);
  addBox(group, "Crew-Torso", [0.46, 0.72, 0.24], [0, 1.12, 0], materials.accent, 0.08);
  cylinderBetween(group, "Crew-Arm", [-0.28, 0.86, 0], [-0.34, 1.46, 0], 0.055, limb, 10);
  cylinderBetween(group, "Crew-Arm", [0.28, 0.86, 0], [0.34, 1.46, 0], 0.055, limb, 10);
  addMesh(group, new THREE.SphereGeometry(0.12, 14, 10), materials.rubber, "Crew-Head", [0, 1.68, 0]);
  group.userData.heightMetres = SHIP.humanReferenceHeightMetres;
  group.userData.interactionType = "crew-reference";
  return group;
}

function makeExteriorDetails(materials) {
  const root = new THREE.Group();
  root.name = "SHIP-B2-TertiaryExterior";
  const cutawayHide = new THREE.Group();
  cutawayHide.name = "SHIP-B2-CutawayHide-Tertiary";
  root.add(cutawayHide);

  // Independent dorsal seam strips and their instanced fasteners. The seam is
  // physical depth; no line is baked into a texture.
  const rivetPlacements = [];
  for (const x of [-7.2, 7.35]) {
    for (const z of [-9.0, -4.5, 0, 4.5]) {
      const strip = seam(4.4, materials.black, { width: 0.018, depth: 0.009 });
      strip.name = "Hull-DorsalPanelSeam";
      strip.position.set(x, 5.25, z);
      root.add(strip);
      for (let dx = -2.0; dx <= 2.001; dx += 0.125) rivetPlacements.push({ pos: [x + dx, 5.27, z] });
    }
  }
  const hullRivets = rivets(rivetPlacements, materials.alloy, 0.007);
  hullRivets.name = "Hull-DorsalPanelRivets";
  root.add(hullRivets);

  for (const x of [-9.72, 9.9]) {
    for (const z of [-6.2, -1.8, 2.6]) {
      const access = addBox(x > 0 ? cutawayHide : root, "Hull-AccessHatch", [0.055, 1.2, 1.6], [x, 2.6, z], materials.hullDark, 0.018);
      access.userData.accessHatch = true;
      const hatchHinge = hinge(materials.alloy, { leaf: 0.12, height: 0.05, pin: 0.009 });
      hatchHinge.name = "Hull-AccessHinge";
      hatchHinge.position.set(x + (x > 0 ? 0.045 : -0.045), 2.6, z - 0.52);
      hatchHinge.rotation.set(0, Math.PI / 2, Math.PI / 2);
      (x > 0 ? cutawayHide : root).add(hatchHinge);
      const dogs = bolts([
        { pos: [x + (x > 0 ? 0.045 : -0.045), 2.25, z + 0.42], rot: [0, 0, Math.PI / 2] },
        { pos: [x + (x > 0 ? 0.045 : -0.045), 2.95, z + 0.42], rot: [0, 0, Math.PI / 2] },
      ], materials.alloy, 0.018);
      dogs.name = "Hull-AccessDogs";
      (x > 0 ? cutawayHide : root).add(dogs);
    }
  }

  for (const x of [-9.78, 9.96]) {
    for (const z of [-7.6, 5.0]) {
      const louvre = vent(1.25, 0.72, materials.alloyDark, { slats: 7, frame: 0.018 });
      louvre.name = "Hull-ServiceVent";
      louvre.position.set(x, 3.35, z);
      louvre.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      (x > 0 ? cutawayHide : root).add(louvre);
    }
  }

  // The airlock is a real boarding threshold. The player begins on this
  // platform, opens the blocking door, and crosses into the same live scene.
  const [platformXMin, platformXMax, platformZMin, platformZMax] = SHIP.boarding.platformBoundsMetres;
  addBox(root, "AIRLOCK-BOARDING-PLATFORM", [
    platformXMax - platformXMin, 0.12, platformZMax - platformZMin,
  ], [
    (platformXMin + platformXMax) / 2, SHIP.boarding.outerDoorPositionMetres[1] - 0.06,
    (platformZMin + platformZMax) / 2,
  ], materials.tread, 0.018);

  const [apertureX, apertureY, apertureZ] = SHIP.boarding.apertureCenterMetres;
  for (const z of [apertureZ - 0.56, apertureZ + 0.56]) {
    addBox(root, "Airlock-ExteriorJamb", [0.10, 2.18, 0.10], [apertureX + 0.01, 2.10, z], materials.alloy, 0.012);
  }
  addBox(root, "Airlock-ExteriorHeader", [0.10, 0.10, 1.22], [apertureX + 0.01, 3.16, apertureZ], materials.alloy, 0.012);
  addBox(root, "Airlock-ExteriorThreshold", [0.16, 0.07, 1.12], [apertureX - 0.02, 1.055, apertureZ], materials.alloyDark, 0.012);
  addBox(root, "Airlock-ExteriorCyclePanel", [0.08, 0.38, 0.24], [apertureX + 0.07, 2.20, apertureZ + 0.77], materials.alloyDark, 0.012);
  addBox(root, "Airlock-ExteriorCycleScreen", [0.04, 0.17, 0.12], [apertureX + 0.115, 2.25, apertureZ + 0.77], materials.screen, 0.006);
  addBox(root, "Airlock-ExteriorLocator", [0.04, 0.12, 0.44], [apertureX + 0.09, apertureY + 1.13, apertureZ], materials.screenAmber, 0.006);

  for (const z of [platformZMin + 0.07, platformZMax - 0.07]) {
    cylinderBetween(root, "Airlock-PlatformRail", [11.05, 1.95, z], [12.46, 1.95, z], 0.022, materials.alloy, 10);
    for (const x of [11.18, 12.42]) {
      cylinderBetween(root, "Airlock-PlatformPost", [x, 1.05, z], [x, 1.95, z], 0.022, materials.alloy, 10);
    }
  }

  // Exterior boarding ladder is co-located with the starboard airlock.
  const boardingLadder = ladder(1.65, materials.alloy, {
    width: SHIP.circulation.ladderWidthMetres,
    rungSpacing: SHIP.circulation.ladderRungSpacingMetres,
  });
  boardingLadder.name = "AIRLOCK-BOARDING-LADDER";
  boardingLadder.position.set(11.18, -0.34, -3.05);
  boardingLadder.rotation.y = -Math.PI / 2;
  root.add(boardingLadder);

  const airlockRail = handrail(1.1, materials.alloy, { radius: 0.018, standoff: 0.07 });
  airlockRail.name = "Airlock-ExteriorGrabRail";
  airlockRail.position.set(11.2, 1.22, -2.2);
  airlockRail.rotation.set(0, -Math.PI / 2, Math.PI / 2);
  root.add(airlockRail);

  // Warning placards are raised colour blocks, not a code-drawn image map.
  for (const [x, y, z, yaw] of [
    [-9.82, 1.55, -8.0, Math.PI / 2], [9.98, 1.58, -7.7, -Math.PI / 2],
    [-9.82, 3.9, 1.4, Math.PI / 2], [10.0, 3.85, 1.0, -Math.PI / 2],
  ]) {
    const placard = addBox(x > 0 ? cutawayHide : root, "Hull-WarningPlacard", [0.03, 0.32, 0.82], [x, y, z], materials.accent, 0.006, [0, yaw, 0]);
    for (const offset of [-0.22, 0, 0.22]) {
      addBox(placard, "Hull-WarningPlacard-Bar", [0.02, 0.045, 0.64], [0.02, offset, 0], materials.black, 0.004, [0, 0, 0.55]);
    }
  }

  for (const x of [-7.2, 0, 7.35]) {
    const bead = weld(3.0, materials.alloyDark, { radius: 0.012, segments: 32 });
    bead.name = "AftDriveBridge-Weld";
    bead.position.set(x, 4.72, -10.0);
    root.add(bead);
  }

  // One run per engine collar; each run is instanced by the shared kit.
  for (const engine of SHIP.engines) {
    const y = engine.positionMetres[1] + engine.radiusMetres * 0.62;
    const z = engine.positionMetres[2] + engine.lengthMetres * 0.28;
    const run = fastenerRun(
      [engine.positionMetres[0] - engine.radiusMetres * 0.62, y, z],
      [engine.positionMetres[0] + engine.radiusMetres * 0.62, y, z],
      materials.alloy,
      { spacing: 0.12, kind: "bolt", radius: 0.012 },
    );
    run.name = `${engine.id}-CollarBolts`;
    root.add(run);
  }

  return { root, cutawayHide };
}

function makeInterior(materials) {
  const root = new THREE.Group();
  root.name = "SHIP-B2-WalkableInterior";
  const ceilings = new THREE.Group();
  ceilings.name = "SHIP-B2-InteriorCeilings";
  const cutawayHide = new THREE.Group();
  cutawayHide.name = "SHIP-B2-CutawayHide-Interior";
  const boardingRoot = new THREE.Group();
  boardingRoot.name = "SHIP-B2-BoardingDoor";
  root.add(ceilings, cutawayHide);
  const groups = { interior: root, interiorCeilings: ceilings, interiorCutawayHide: cutawayHide };
  const doors = [];
  const stationObjects = new Map();
  const roomObjects = new Map();
  const navZones = { L1: [], L2: [] };

  for (const deck of SHIP.decks) {
    const c = deck.corridor;
    navZones[deck.id].push({ id: `NAV-${deck.id}-CORRIDOR`, xMin: c.xMin, xMax: c.xMax, zMin: c.zMin, zMax: c.zMax });
    makeCorridor(deck, groups, materials);
    for (const room of deck.rooms) {
      navZones[deck.id].push({ id: `NAV-${room.id}`, xMin: room.bounds[0], xMax: room.bounds[1], zMin: room.bounds[2], zMax: room.bounds[3] });
      roomObjects.set(room.id, makeRoomShell(room, deck, groups, materials, doors));
      makeRoomConnector(room, deck, groups, materials, navZones);
    }
  }

  const [platformXMin, platformXMax, platformZMin, platformZMax] = SHIP.boarding.platformBoundsMetres;
  navZones.L1.push({
    id: "NAV-L1-BOARDING-PLATFORM",
    xMin: platformXMin,
    xMax: platformXMax,
    zMin: platformZMin,
    zMax: platformZMax,
  });

  const transfers = makeVerticalTransfers(groups, materials, navZones);

  for (const station of SHIP.stations.filter((item) => item.seat)) {
    const seat = makeSeat(station, materials);
    root.add(seat);
    stationObjects.set(station.id, seat);
  }

  const lower = SHIP.decks.find((deck) => deck.id === "L1");
  const upper = SHIP.decks.find((deck) => deck.id === "L2");
  furnishCockpit(root, upper, materials);
  furnishCargo(root, lower, materials);
  furnishCrewGalley(root, lower, materials);
  furnishPortCabin(root, upper, materials);
  furnishEngineering(root, lower, materials);
  furnishGunnery(root, upper, SHIP.stations.find((item) => item.id === "STN-DORSAL"), materials);
  furnishGunnery(root, lower, SHIP.stations.find((item) => item.id === "STN-VENTRAL"), materials);
  furnishAirlock(root, boardingRoot, lower, materials, doors);

  return { root, boardingRoot, ceilings, cutawayHide, doors, stationObjects, roomObjects, navZones, ...transfers };
}

function routeLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += new THREE.Vector3(...points[i - 1]).distanceTo(new THREE.Vector3(...points[i]));
  }
  return length;
}

function insideZone(point, zone, radius = 0) {
  return point[0] >= zone.xMin - radius && point[0] <= zone.xMax + radius &&
    point[2] >= zone.zMin - radius && point[2] <= zone.zMax + radius;
}

function circleInsideZoneUnion(point, zones, radius) {
  const probes = [[point[0], point[2]]];
  for (let index = 0; index < 16; index++) {
    const angle = index / 16 * Math.PI * 2;
    probes.push([point[0] + Math.cos(angle) * radius, point[2] + Math.sin(angle) * radius]);
  }
  return probes.every(([x, z]) => zones.some((zone) =>
    x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax));
}

function closestDeck(point) {
  return [...SHIP.decks].sort((a, b) =>
    Math.abs(point[1] - (a.floorYMetres + 0.12)) - Math.abs(point[1] - (b.floorYMetres + 0.12)))[0];
}

function routeReport(route, navZones) {
  const from = SHIP.stations.find((station) => station.id === route.fromStation);
  const to = SHIP.stations.find((station) => station.id === route.toStation);
  const first = new THREE.Vector3(...route.pointsMetres[0]);
  const last = new THREE.Vector3(...route.pointsMetres.at(-1));
  const fromDistance = first.distanceTo(new THREE.Vector3(...from.positionMetres));
  const toDistance = last.distanceTo(new THREE.Vector3(...to.positionMetres));
  const pointChecks = route.pointsMetres.map((point) => {
    const deck = closestDeck(point);
    return {
      point: [...point],
      deck: deck.id,
      navigable: navZones[deck.id].some((zone) => insideZone(point, zone, 0.04)),
    };
  });
  const sampleChecks = [];
  for (let index = 1; index < route.pointsMetres.length; index++) {
    const a = new THREE.Vector3(...route.pointsMetres[index - 1]);
    const b = new THREE.Vector3(...route.pointsMetres[index]);
    const distance = a.distanceTo(b);
    const samples = Math.max(1, Math.ceil(distance / 0.1));
    for (let sample = 0; sample <= samples; sample++) {
      const point = a.clone().lerp(b, sample / samples);
      const vertical = Math.abs(a.y - b.y) > 0.2 && Math.hypot(a.x - b.x, a.z - b.z) < 0.02;
      const deck = closestDeck(point.toArray());
      const navigable = vertical
        ? Math.min(
          Math.hypot(point.x - SHIP.mechanisms.ladderXMetres, point.z - SHIP.mechanisms.verticalTransferZMetres),
          Math.hypot(point.x - SHIP.mechanisms.elevatorXMetres, point.z - SHIP.mechanisms.verticalTransferZMetres),
        ) < 0.05
        : circleInsideZoneUnion(point.toArray(), navZones[deck.id], SHIP.onFoot.bodyRadiusMetres);
      sampleChecks.push({ segment: index - 1, t: round(sample / samples), point: vec(point), vertical, navigable });
    }
  }
  return {
    id: route.id,
    name: route.name,
    lengthMetres: round(routeLength(route.pointsMetres)),
    fromStation: route.fromStation,
    toStation: route.toStation,
    endpointErrorMetres: { from: round(fromDistance), to: round(toDistance) },
    pointChecks,
    sampledEveryMetres: 0.1,
    sampleCount: sampleChecks.length,
    failedSamples: sampleChecks.filter((check) => !check.navigable),
    passed: fromDistance < 0.01 && toDistance < 0.01 &&
      pointChecks.every((check) => check.navigable) && sampleChecks.every((check) => check.navigable),
  };
}

function measureBounds(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().makeEmpty();
  const objectBox = new THREE.Box3();
  root.traverse((object) => {
    if (!object.isMesh || object.userData.excludeFromMetrics) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    objectBox.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    box.union(objectBox);
  });
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return { min: vec(box.min), max: vec(box.max), center: vec(center), dimensionsMetres: vec(size) };
}

function registerShipAssets(ship) {
  registerAsset(ship.root, "heroShip", { flags: { selected: true, silhouette: "B", detailed: true } });
  registerAsset(ship.interior.root, "shipInterior", { flags: { walkable: true, decks: 2 } });
  for (const [id, room] of ship.interior.roomObjects) registerAsset(room, "shipRoom", { id, flags: { walkable: true } });
  for (const [id, station] of ship.interior.stationObjects) registerAsset(station, "crewStation", { id, flags: { seat: true } });
}

export function buildHeroShip(materials) {
  const root = new THREE.Group();
  root.name = SHIP.id;
  const exterior = makePrimaryHull(materials);
  const secondary = makeExteriorSecondary(materials);
  const details = makeExteriorDetails(materials);
  const interior = makeInterior(materials);
  const crewFigure = makeCrewFigure(materials);
  root.add(exterior.root, secondary.root, details.root, interior.root, interior.boardingRoot, crewFigure);

  const batching = {
    exteriorCutaway: batchStaticMeshes(exterior.cutawayHide, "ExteriorCutaway"),
    exterior: batchStaticMeshes(exterior.root, "Exterior", [exterior.cutawayHide]),
    secondaryCutaway: batchStaticMeshes(secondary.cutawayHide, "SecondaryCutaway"),
    secondary: batchStaticMeshes(secondary.root, "Secondary", [secondary.cutawayHide]),
    detailCutaway: batchStaticMeshes(details.cutawayHide, "DetailCutaway"),
    details: batchStaticMeshes(details.root, "Details", [details.cutawayHide]),
    interiorCeilings: batchStaticMeshes(interior.ceilings, "InteriorCeilings"),
    interiorCutaway: batchStaticMeshes(interior.cutawayHide, "InteriorCutaway"),
    interior: batchStaticMeshes(interior.root, "Interior", [interior.ceilings, interior.cutawayHide]),
  };

  const mechanisms = [...interior.doors, interior.elevator];
  const routes = SHIP.crewRoutes.map((route) => routeReport(route, interior.navZones));
  const pressureBounds = measureBounds(exterior.root);
  const operationalGroup = new THREE.Group();
  operationalGroup.add(exterior.root.clone(true), secondary.root.clone(true), details.root.clone(true));
  const operationalBounds = measureBounds(operationalGroup);
  operationalGroup.clear();

  const report = () => ({
    generatedAt: new Date().toISOString(),
    id: SHIP.id,
    name: SHIP.name,
    selectedSilhouette: SHIP.selectedSilhouette,
    declaredPressureHullDimensionsMetres: { ...SHIP.dimensionsMetres },
    pressureHullMeasured: pressureBounds,
    operationalEnvelopeMeasured: operationalBounds,
    coordinateSystem: { ...SHIP.coordinateSystem },
    humanReferenceHeightMetres: SHIP.humanReferenceHeightMetres,
    circulation: {
      ...SHIP.circulation,
      deckClearHeightsMetres: SHIP.decks.map((deck) => round(deck.ceilingYMetres - deck.floorYMetres)),
    },
    decks: SHIP.decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      floorYMetres: deck.floorYMetres,
      ceilingYMetres: deck.ceilingYMetres,
      rooms: deck.rooms.map((room) => ({ id: room.id, name: room.name, boundsMetres: [...room.bounds] })),
    })),
    crewStations: SHIP.stations.map((station) => ({ ...station, positionMetres: [...station.positionMetres] })),
    weapons: SHIP.weapons.map((weapon) => ({ ...weapon })),
    routes,
    routeGatePassed: routes.every((route) => route.passed),
    mechanisms: mechanisms.map((mechanism) => mechanism.report()),
    geometry: countGeometry(root),
    batching,
    addresses: {
      ship: gridAddress(root.position.x, root.position.z),
      stations: SHIP.stations.map((station) => ({ id: station.id, address: gridAddress(station.positionMetres[0], station.positionMetres[2]) })),
    },
  });

  const ship = {
    root,
    exterior,
    secondary,
    details,
    interior,
    crewFigure,
    mechanisms,
    report,
    update(dt) { for (const mechanism of mechanisms) mechanism.update(dt); },
    setCrewVisible(visible) { crewFigure.visible = Boolean(visible); },
    setDisplayMode(mode) {
      const interiorVisible = new Set(["cutaway", "cockpit", "corridor", "lower", "dorsal", "ventral", "walk"]).has(mode);
      const exteriorVisible = new Set(["exterior", "engines", "walk"]).has(mode);
      exterior.root.visible = exteriorVisible;
      secondary.root.visible = exteriorVisible;
      details.root.visible = exteriorVisible;
      interior.root.visible = interiorVisible;
      interior.boardingRoot.visible = new Set(["exterior", "cutaway", "lower", "walk"]).has(mode);
      const cutaway = mode === "cutaway";
      exterior.cutawayHide.visible = !cutaway;
      secondary.cutawayHide.visible = !cutaway;
      details.cutawayHide.visible = !cutaway;
      interior.cutawayHide.visible = !cutaway;
      interior.ceilings.visible = mode !== "cutaway";
      crewFigure.visible = mode === "exterior";
    },
  };
  registerShipAssets(ship);
  ship.setDisplayMode("exterior");
  return ship;
}

export function installShipUtilityLights(ship) {
  const specs = [
    { id: "LGT-COCKPIT", color: 0xbfeff2, intensity: 12, distance: 7.0, position: [0, 5.42, 7.4] },
    { id: "LGT-UPPER-CORRIDOR", color: 0xcce8e8, intensity: 14, distance: 8.0, position: [0, 5.34, 1.8] },
    { id: "LGT-LOWER-CORRIDOR", color: 0xf0c08a, intensity: 12, distance: 8.0, position: [0, 2.82, -1.0] },
    { id: "LGT-ENGINEERING", color: 0xf19a58, intensity: 22, distance: 7.0, position: [0, 2.72, -10.8] },
    { id: "LGT-AIRLOCK", color: 0x7ddbd5, intensity: 13, distance: 5.0, position: [9.45, 2.72, -3.05] },
    { id: "LGT-DORSAL-GUN", color: 0x9bdfe1, intensity: 11, distance: 4.5, position: [7.1, 5.32, 0.75] },
    { id: "LGT-VENTRAL-GUN", color: 0xe2a268, intensity: 10, distance: 4.2, position: [0, 2.82, -6.3] },
  ];
  const lights = specs.map((spec) => {
    const light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, 2);
    light.name = spec.id;
    light.position.set(...spec.position);
    light.castShadow = false;
    light.userData.fixtureLinked = true;
    ship.interior.root.add(light);
    return light;
  });
  ship.utilityLights = lights;
  ship.utilityLightReport = () => specs.map((spec) => ({ ...spec, position: [...spec.position], shadows: false }));
  return lights;
}
