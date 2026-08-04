import * as THREE from "three";
import { CONFIG } from "./config.js";

const VIEW_NAMES = Object.freeze({
  top: "PLAN · DORSAL",
  side: "ELEVATION · PORT",
  front: "ELEVATION · FORWARD",
});

function dimensionsForView(size, view) {
  if (view === "top") return { horizontal: size.x, vertical: size.z };
  if (view === "side") return { horizontal: size.z, vertical: size.y };
  return { horizontal: size.x, vertical: size.y };
}

function fitOrthographicCamera(camera, bounds, view, aspect, padding = 1.48) {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const { horizontal, vertical } = dimensionsForView(size, view);
  let halfWidth = horizontal * padding / 2;
  let halfHeight = vertical * padding / 2;
  if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect;
  else halfHeight = halfWidth / aspect;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.near = 0.1;
  camera.far = Math.max(200, size.length() * 8);
  const distance = Math.max(60, size.length() * 3);

  if (view === "top") {
    camera.position.set(center.x, center.y + distance, center.z);
    camera.up.set(0, 0, 1);
  } else if (view === "side") {
    camera.position.set(center.x - distance, center.y, center.z);
    camera.up.set(0, 1, 0);
  } else {
    camera.position.set(center.x, center.y, center.z + distance);
    camera.up.set(0, 1, 0);
  }
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function sheetRegions(width, height) {
  if (width >= 760 && width / height > 0.95) {
    const leftWidth = Math.round(width * 0.64);
    return {
      top: { x: 0, y: 0, width: leftWidth, height },
      side: { x: leftWidth, y: Math.round(height * 0.5), width: width - leftWidth, height: Math.ceil(height * 0.5) },
      front: { x: leftWidth, y: 0, width: width - leftWidth, height: Math.floor(height * 0.5) },
    };
  }
  const topHeight = Math.round(height * 0.5);
  const sideHeight = Math.round(height * 0.28);
  return {
    top: { x: 0, y: height - topHeight, width, height: topHeight },
    side: { x: 0, y: height - topHeight - sideHeight, width, height: sideHeight },
    front: { x: 0, y: 0, width, height: height - topHeight - sideHeight },
  };
}

export class SilhouetteStage {
  constructor({ renderer, scene, rig, root, options, labelLayer }) {
    this.renderer = renderer;
    this.scene = scene;
    this.rig = rig;
    this.root = root;
    this.options = options;
    this.labelLayer = labelLayer;
    this.mode = "sheet";
    this.activeKey = "A";
    this.turntableAngleDegrees = 45;
    this.cameras = {
      top: new THREE.OrthographicCamera(),
      side: new THREE.OrthographicCamera(),
      front: new THREE.OrthographicCamera(),
      turntable: new THREE.PerspectiveCamera(38, 1, 0.1, 300),
      comparison: new THREE.PerspectiveCamera(42, 1, 0.1, 320),
    };
    this.setOption(this.activeKey);
  }

  setOption(key) {
    const normalized = String(key || "A").toUpperCase();
    if (!this.options.has(normalized)) throw new Error(`Unknown silhouette option: ${key}`);
    this.activeKey = normalized;
    for (const [optionKey, option] of this.options) option.group.visible = optionKey === normalized;
    return this.active();
  }

  setMode(mode) {
    if (!new Set(["sheet", "turntable", "rig"]).has(mode)) throw new Error(`Unknown view mode: ${mode}`);
    this.mode = mode;
    this.rig.visible = mode === "rig";
    this.root.visible = mode !== "rig";
    this.labelLayer.hidden = mode !== "sheet";
  }

  setTurntableAngle(degrees) {
    const allowed = CONFIG.harness.turntableAnglesDegrees;
    const requested = Number(degrees);
    this.turntableAngleDegrees = allowed.reduce((best, candidate) =>
      Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best, allowed[0]);
    return this.turntableAngleDegrees;
  }

  active() {
    return this.options.get(this.activeKey);
  }

  render() {
    if (this.mode === "sheet") this.renderSheet();
    else if (this.mode === "turntable") this.renderTurntable();
  }

  renderSheet() {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    const regions = sheetRegions(width, height);
    const bounds = new THREE.Box3().setFromObject(this.active().group);

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setClearColor(0x0b1116, 1);
    this.renderer.clear(true, true, true);
    this.renderer.setScissorTest(true);
    const previousAutoReset = this.renderer.info.autoReset;
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();

    for (const [view, region] of Object.entries(regions)) {
      const camera = this.cameras[view];
      fitOrthographicCamera(camera, bounds, view, region.width / region.height);
      this.renderer.setViewport(region.x, region.y, region.width, region.height);
      this.renderer.setScissor(region.x, region.y, region.width, region.height);
      this.renderer.render(this.scene, camera);
    }
    this.renderer.info.autoReset = previousAutoReset;
    this.renderer.setScissorTest(false);
    this.updateLabels(regions, height);
    this.drawRenderSentinel();
  }

  renderTurntable() {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    const option = this.active();
    const bounds = new THREE.Box3().setFromObject(option.group);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 1.25;
    const angle = THREE.MathUtils.degToRad(this.turntableAngleDegrees);
    const camera = this.cameras.turntable;
    camera.aspect = width / height;
    camera.position.set(
      center.x + Math.sin(angle) * radius,
      center.y + size.y * 0.72,
      center.z + Math.cos(angle) * radius,
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setClearColor(0x0b1116, 1);
    this.renderer.render(this.scene, camera);
    this.drawRenderSentinel();
  }

  renderComparisonCamera() {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    const camera = this.cameras.comparison;
    camera.aspect = width / height;
    camera.position.set(...CONFIG.harness.wideCameraPositionMetres);
    camera.lookAt(new THREE.Vector3(...CONFIG.harness.wideCameraTargetMetres));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.info.reset();
    this.renderer.render(this.scene, camera);
  }

  updateLabels(regions, canvasHeight) {
    this.labelLayer.innerHTML = Object.entries(regions).map(([view, region]) => {
      const top = canvasHeight - region.y - region.height;
      const labelTop = view === "top" && top < 30 ? top + 96 : top + 12;
      return `<div class="view-label" style="left:${region.x + 12}px;top:${labelTop}px">${VIEW_NAMES[view]}</div>`;
    }).join("");
  }

  drawRenderSentinel() {
    // lib/v1/harness samples the lower-left 220 px of the WebGL buffer. A
    // correctly rendered orthographic sheet can leave that corner uniformly
    // empty, so a 6 px two-tone sentinel distinguishes "drawn empty corner"
    // from "canvas never drew" without altering the asset itself.
    const oldColor = this.renderer.getClearColor(new THREE.Color());
    const oldAlpha = this.renderer.getClearAlpha();
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, 6, 6);
    this.renderer.setClearColor(0x78d5e7, 1);
    this.renderer.clear(true, false, false);
    this.renderer.setScissor(0, 0, 3, 3);
    this.renderer.setClearColor(0xe0b96d, 1);
    this.renderer.clear(true, false, false);
    this.renderer.setClearColor(oldColor, oldAlpha);
    this.renderer.setScissorTest(false);
  }
}
