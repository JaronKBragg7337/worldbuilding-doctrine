import * as THREE from "three";
import { CONFIG } from "./config.js";

const TONES = Object.freeze({
  primary: 0xb8d3d9,
  low: 0x718f98,
  high: 0xe2eef0,
  accent: 0xe0b96d,
});

export function loftGeometry(stations, radialSegments = 8, offsetX = 0) {
  if (stations.length < 2) throw new Error("A loft needs at least two stations.");
  const positions = [];
  const indices = [];

  for (const station of stations) {
    for (let segment = 0; segment < radialSegments; segment++) {
      const angle = segment / radialSegments * Math.PI * 2;
      positions.push(
        offsetX + (station.x || 0) + Math.cos(angle) * station.width / 2,
        station.y + Math.sin(angle) * station.height / 2,
        station.z,
      );
    }
  }

  for (let station = 0; station < stations.length - 1; station++) {
    const current = station * radialSegments;
    const next = (station + 1) * radialSegments;
    for (let segment = 0; segment < radialSegments; segment++) {
      const following = (segment + 1) % radialSegments;
      const a = current + segment;
      const d = current + following;
      const b = next + segment;
      const c = next + following;
      indices.push(a, d, c, a, c, b);
    }
  }

  const first = stations[0];
  const last = stations.at(-1);
  const firstCenter = positions.length / 3;
  positions.push(offsetX + (first.x || 0), first.y, first.z);
  const lastCenter = positions.length / 3;
  positions.push(offsetX + (last.x || 0), last.y, last.z);
  const lastRing = (stations.length - 1) * radialSegments;
  for (let segment = 0; segment < radialSegments; segment++) {
    const following = (segment + 1) % radialSegments;
    indices.push(firstCenter, following, segment);
    indices.push(lastCenter, lastRing + segment, lastRing + following);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function prismGeometry(points, yMin, yMax) {
  if (points.length < 3) throw new Error("A prism needs at least three plan points.");
  const positions = [];
  const indices = [];
  for (const y of [yMin, yMax]) {
    for (const [x, z] of points) positions.push(x, y, z);
  }
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    indices.push(i, next, count + next, i, count + next, count + i);
  }
  for (let i = 1; i < count - 1; i++) {
    indices.push(0, i + 1, i);
    indices.push(count, count + i, count + i + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function componentGeometry(component) {
  if (component.type === "loft") {
    return loftGeometry(component.stations, component.radialSegments || 8, component.offsetX || 0);
  }
  if (component.type === "prism") {
    return prismGeometry(component.points, component.yMin, component.yMax);
  }
  throw new Error(`Unknown silhouette component type: ${component.type}`);
}

function addComponent(group, component, materials) {
  const geometry = componentGeometry(component);
  const mesh = new THREE.Mesh(geometry, materials[component.tone] || materials.primary);
  mesh.name = component.name;
  mesh.userData.silhouetteComponent = true;
  group.add(mesh);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 22),
    materials.outline,
  );
  outline.name = `${component.name}-form-lines`;
  outline.renderOrder = 2;
  group.add(outline);
}

function makeMaterials() {
  const materials = {};
  for (const [name, color] of Object.entries(TONES)) {
    materials[name] = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      depthWrite: true,
      fog: false,
    });
  }
  materials.outline = new THREE.LineBasicMaterial({
    color: 0x1d2c33,
    transparent: true,
    opacity: 0.82,
    fog: false,
  });
  return materials;
}

function measureGroup(group) {
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  let meshes = 0;
  let triangles = 0;
  group.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    const geometry = object.geometry;
    triangles += geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
  });
  const number = (value) => +value.toFixed(3);
  return {
    boundsMetres: {
      min: bounds.min.toArray().map(number),
      max: bounds.max.toArray().map(number),
      center: center.toArray().map(number),
    },
    dimensionsMetres: {
      width: number(size.x),
      height: number(size.y),
      length: number(size.z),
    },
    planAspectWidthToLength: number(size.x / size.z),
    meshes,
    triangles,
  };
}

export function buildSilhouetteOptions() {
  const materials = makeMaterials();
  const root = new THREE.Group();
  root.name = "SilhouetteOptions";
  const options = new Map();

  for (const [key, spec] of Object.entries(CONFIG.silhouettes)) {
    const group = new THREE.Group();
    group.name = `Silhouette-${key}-${spec.name.replace(/\s+/g, "")}`;
    for (const component of spec.components) addComponent(group, component, materials);
    group.visible = false;
    root.add(group);
    options.set(key, { key, spec, group, measurement: measureGroup(group) });
  }
  return { root, options, materials };
}

export function silhouetteReport(options) {
  return {
    generatedAt: new Date().toISOString(),
    stage: "primary-form-only",
    coordinateSystem: { forward: "+Z", up: "+Y", right: "+X" },
    options: [...options.values()].map(({ key, spec, measurement }) => ({
      key,
      name: spec.name,
      concept: spec.concept,
      components: spec.components.map((component) => component.name),
      ...measurement,
    })),
    deliberatelyAbsent: [
      "surface materials",
      "panel seams",
      "rivets and welds",
      "openings",
      "landing gear",
      "thrusters",
      "interior",
      "lighting polish",
    ],
  };
}
