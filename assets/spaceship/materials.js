import * as THREE from "three";
import { CARDS, surface } from "../../lib/v1/surface.js";

// Asset-local cards extend the frozen v1 surface registry at runtime. The
// projection, anti-tiling, normal-frame reconstruction and quality tiers remain
// the shared implementation; this file contributes only spaceship data.
export const SHIP_CARDS = Object.freeze({
  shipCoat: Object.freeze({
    id: "MAT-SHIP-COAT-0001",
    base: "Paint004",
    label: "Ceramic-polymer coated panel",
    tile: Object.freeze([1.0, 1.0]),
    sizeSource: "ESTIMATE: non-periodic coating; ambientCG reports 0x0",
    roughness: 0.72,
    metalness: 0,
    maps: Object.freeze(["color", "normal", "rough", "ao"]),
    measuredLinearMean: 0.70483,
  }),
  shipServiceAlloy: Object.freeze({
    id: "MAT-SHIP-ALLOY-0001",
    base: "Metal046B",
    label: "Blackened service alloy",
    tile: Object.freeze([1.5, 1.5]),
    sizeSource: "ESTIMATE: non-periodic metal; ambientCG reports 0x0",
    roughness: 0.58,
    metalness: 0.88,
    maps: Object.freeze(["color", "normal", "rough"]),
    measuredLinearMean: 0.05059,
  }),
  shipTread: Object.freeze({
    id: "MAT-SHIP-DECK-0001",
    base: "DiamondPlate005D",
    label: "Industrial tread plate",
    tile: Object.freeze([0.8, 0.8]),
    sizeSource: "ESTIMATE with measured cue: 51 px period at assumed 40 mm lug pitch",
    roughness: 0.66,
    metalness: 0.82,
    maps: Object.freeze(["color", "normal", "rough", "ao"]),
    measuredLinearMean: 0.14804,
  }),
  shipRubber: Object.freeze({
    id: "MAT-SHIP-FLOOR-0001",
    base: "Rubber004",
    label: "Resilient black floor",
    tile: Object.freeze([0.75, 0.75]),
    sizeSource: "published: ambientCG 75x75 cm",
    roughness: 0.92,
    metalness: 0,
    maps: Object.freeze(["color", "normal", "rough"]),
    measuredLinearMean: 0.02687,
  }),
});

let installed = false;

export function installSpaceshipMaterialCards() {
  if (installed) return;
  for (const [key, card] of Object.entries(SHIP_CARDS)) {
    if (CARDS[key] && CARDS[key].id !== card.id) {
      throw new Error(`Material-card collision for ${key}: ${CARDS[key].id}`);
    }
    CARDS[key] = card;
  }
  installed = true;
}

function tag(material, id, role) {
  material.name = id;
  material.userData.materialId = id;
  material.userData.role = role;
  return material;
}

export function buildShipMaterials() {
  installSpaceshipMaterialCards();

  const projected = (key, options, id, role) => tag(surface(key, {
    local: true,
    grime: 0,
    dust: 0.08,
    macro: 0.28,
    ...options,
  }), id, role);

  const materials = {
    hull: projected("shipCoat", {
      color: 0x77888d, roughness: 0.92, gamma: 1.0, normalScale: 0.48,
    }, "MAT-SHIP-HULL-COAT", "exterior coated pressure shell"),
    hullDark: projected("shipCoat", {
      color: 0x35454a, roughness: 1.08, gamma: 0.88, normalScale: 0.55,
    }, "MAT-SHIP-HULL-DARK", "recessed exterior coated panel"),
    interior: projected("shipCoat", {
      color: 0x7f796e, roughness: 1.08, gamma: 0.9, normalScale: 0.34,
    }, "MAT-SHIP-INTERIOR-PANEL", "warm-grey interior panel"),
    interiorDark: projected("shipCoat", {
      color: 0x403f3b, roughness: 1.12, gamma: 0.78, normalScale: 0.38,
    }, "MAT-SHIP-INTERIOR-DARK", "interior service panel"),
    accent: projected("shipCoat", {
      color: 0xb64f2f, roughness: 1.0, gamma: 0.9, normalScale: 0.4,
    }, "MAT-SHIP-ACCENT", "oxide-orange identification panel"),
    alloy: projected("shipServiceAlloy", {
      color: 0xb8c0c2, roughness: 1.0, gamma: 0.68, gain: 1.15,
      normalScale: 0.52, macro: 0.18,
    }, "MAT-SHIP-SERVICE-ALLOY", "exposed structural alloy"),
    alloyDark: projected("shipServiceAlloy", {
      color: 0x6b7374, roughness: 1.12, gamma: 0.76, gain: 1.08,
      normalScale: 0.6, macro: 0.22,
    }, "MAT-SHIP-ENGINE-ALLOY", "blackened engine alloy"),
    tread: projected("shipTread", {
      color: 0x737a7d, roughness: 1.04, gamma: 0.9, normalScale: 0.72,
      macro: 0.12,
    }, "MAT-SHIP-TREAD", "tread-plate deck"),
    rubber: projected("shipRubber", {
      color: 0x777f82, roughness: 1.0, gamma: 0.7, gain: 1.02,
      normalScale: 0.45, macro: 0.1,
    }, "MAT-SHIP-RUBBER", "resilient floor and upholstery"),
  };

  materials.glass = tag(new THREE.MeshPhysicalMaterial({
    color: 0x182a33,
    roughness: 0.18,
    metalness: 0,
    transmission: 0.32,
    transparent: true,
    opacity: 0.72,
    thickness: 0.06,
    side: THREE.DoubleSide,
  }), "MAT-SHIP-GLASS", "laminated canopy glass");
  materials.screen = tag(new THREE.MeshBasicMaterial({
    color: 0x278a87,
    toneMapped: true,
  }), "MAT-SHIP-SCREEN", "cyan instrument display");
  materials.screenAmber = tag(new THREE.MeshBasicMaterial({
    color: 0xb86f2f,
    toneMapped: true,
  }), "MAT-SHIP-SCREEN-AMBER", "amber status display");
  materials.warning = tag(new THREE.MeshStandardMaterial({
    color: 0x6d251e,
    emissive: 0xe34b3f,
    emissiveIntensity: 0.8,
    roughness: 0.6,
  }), "MAT-SHIP-WARNING", "warning indicator");
  materials.light = tag(new THREE.MeshBasicMaterial({
    color: 0xc8f1f3,
    toneMapped: false,
  }), "MAT-SHIP-LUMINAIRE", "utility luminaire lens");
  materials.black = tag(new THREE.MeshStandardMaterial({
    color: 0x0c1012,
    roughness: 0.82,
    metalness: 0.35,
  }), "MAT-SHIP-BLACK", "unmapped small hardware");

  return materials;
}

export function spaceshipMaterialReport() {
  return {
    installed,
    sourceRoute: "ambientCG CC0 1.0; locally converted to WebP",
    textureDrawingInCode: false,
    cards: Object.entries(SHIP_CARDS).map(([key, card]) => ({
      key,
      id: card.id,
      label: card.label,
      base: card.base,
      tileMetres: [...card.tile],
      sizeSource: card.sizeSource,
      measuredLinearMean: card.measuredLinearMean,
      maps: [...card.maps],
    })),
  };
}
