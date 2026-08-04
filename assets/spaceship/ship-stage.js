import * as THREE from "three";
import { CONFIG } from "./config.js";

const MODES = new Set(["exterior", "engines", "cutaway", "cockpit", "corridor", "lower", "dorsal", "ventral", "walk", "rig", "archive"]);

export class HeroShipStage {
  constructor({ renderer, scene, camera, rig, ship, silhouettes, silhouetteStage }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.rig = rig;
    this.ship = ship;
    this.silhouettes = silhouettes;
    this.silhouetteStage = silhouetteStage;
    this.mode = "exterior";
    this.turntableAngleDegrees = 135;
    this.applyVisibility();
  }

  setMode(mode) {
    if (!MODES.has(mode)) throw new Error(`Unknown hero-ship view: ${mode}`);
    this.mode = mode;
    if (mode === "archive") {
      this.silhouetteStage.setOption("B");
      this.silhouetteStage.setMode("sheet");
    }
    this.applyVisibility();
    return mode;
  }

  applyVisibility() {
    const rigVisible = this.mode === "rig";
    const archiveVisible = this.mode === "archive";
    this.rig.visible = rigVisible;
    this.silhouettes.root.visible = archiveVisible;
    this.ship.root.visible = !rigVisible && !archiveVisible;
    if (!rigVisible && !archiveVisible) this.ship.setDisplayMode(this.mode);
  }

  setTurntableAngle(degrees) {
    const allowed = CONFIG.harness.turntableAnglesDegrees;
    const requested = Number(degrees);
    this.turntableAngleDegrees = allowed.reduce((best, candidate) =>
      Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best, allowed[0]);
    if (this.mode !== "exterior") this.setMode("exterior");
    return this.turntableAngleDegrees;
  }

  stepTurntable(direction) {
    const allowed = CONFIG.harness.turntableAnglesDegrees;
    const index = allowed.indexOf(this.turntableAngleDegrees);
    return this.setTurntableAngle(allowed[(index + Number(direction) + allowed.length) % allowed.length]);
  }

  prepareCamera() {
    const views = CONFIG.ship.fixedViews;
    const aspect = this.renderer.domElement.clientWidth / this.renderer.domElement.clientHeight;
    this.camera.aspect = aspect;
    const interiorView = new Set(["cockpit", "corridor", "lower", "dorsal", "ventral"]).has(this.mode);
    this.camera.fov = interiorView ? 64 : this.mode === "engines" ? 50 : 42;
    this.camera.near = interiorView ? 0.04 : 0.08;
    this.camera.far = CONFIG.followCamera.farMetres;

    if (this.mode === "exterior") {
      const target = new THREE.Vector3(...views.exteriorTargetMetres);
      const radius = Math.hypot(views.exteriorCameraMetres[0], views.exteriorCameraMetres[2]);
      const angle = THREE.MathUtils.degToRad(this.turntableAngleDegrees);
      this.camera.position.set(
        target.x + Math.sin(angle) * radius,
        views.exteriorCameraMetres[1],
        target.z + Math.cos(angle) * radius,
      );
      this.camera.lookAt(target);
    } else if (this.mode === "engines") {
      this.camera.position.set(...views.engineCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.engineTargetMetres));
    } else if (this.mode === "cutaway") {
      this.camera.position.set(...views.cutawayCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.cutawayTargetMetres));
    } else if (this.mode === "cockpit") {
      this.camera.position.set(...views.cockpitCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.cockpitTargetMetres));
    } else if (this.mode === "corridor") {
      this.camera.position.set(...views.corridorCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.corridorTargetMetres));
    } else if (this.mode === "lower") {
      this.camera.position.set(...views.lowerDeckCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.lowerDeckTargetMetres));
    } else if (this.mode === "dorsal") {
      this.camera.position.set(...views.dorsalGunnerCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.dorsalGunnerTargetMetres));
    } else if (this.mode === "ventral") {
      this.camera.position.set(...views.ventralGunnerCameraMetres);
      this.camera.lookAt(new THREE.Vector3(...views.ventralGunnerTargetMetres));
    }
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }

  render() {
    if (this.mode === "archive") {
      this.silhouetteStage.render();
      return;
    }
    if (this.mode === "rig") return;
    if (this.mode !== "walk") this.prepareCamera();
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.render(this.scene, this.camera);
    this.drawRenderSentinel();
  }

  renderFixedWide() {
    const previous = this.mode;
    this.setMode("exterior");
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.fov = 42;
    this.camera.position.set(...CONFIG.ship.fixedViews.exteriorCameraMetres);
    this.camera.lookAt(new THREE.Vector3(...CONFIG.ship.fixedViews.exteriorTargetMetres));
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    const result = {
      cameraPositionMetres: [...CONFIG.ship.fixedViews.exteriorCameraMetres],
      cameraTargetMetres: [...CONFIG.ship.fixedViews.exteriorTargetMetres],
      viewportCssPixels: [width, height],
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
    this.setMode(previous);
    return result;
  }

  drawRenderSentinel() {
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

  report() {
    return {
      mode: this.mode,
      turntableAngleDegrees: this.turntableAngleDegrees,
      fixedViews: Object.fromEntries(Object.entries(CONFIG.ship.fixedViews).map(([key, value]) => [key, [...value]])),
    };
  }
}
