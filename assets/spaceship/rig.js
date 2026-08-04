import * as THREE from "three";
import { surface, surfaceReport } from "../../lib/v1/surface.js";
import {
  addressReport,
  gridAddress,
  registerAsset,
} from "../../lib/v1/address.js";
import { CONFIG } from "./config.js";

const UP = new THREE.Vector3(...CONFIG.world.up);
const round = (value) => +value.toFixed(CONFIG.simulation.tracePrecisionDecimals);
const vec = (v) => [round(v.x), round(v.y), round(v.z)];
const quat = (q) => [round(q.x), round(q.y), round(q.z), round(q.w)];

function moveToward(value, target, maxDelta) {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

function makeCourseRibbon(points, width, material) {
  const half = width / 2;
  const positions = [];
  const indices = [];
  const p = points.map((item) => new THREE.Vector3(...item.positionMetres));

  for (let i = 0; i < p.length; i++) {
    const prev = p[Math.max(0, i - 1)];
    const next = p[Math.min(p.length - 1, i + 1)];
    const tangent = next.clone().sub(prev).setY(0).normalize();
    const right = new THREE.Vector3(tangent.z, 0, -tangent.x).multiplyScalar(half);
    positions.push(p[i].x - right.x, p[i].y, p[i].z - right.z);
    positions.push(p[i].x + right.x, p[i].y, p[i].z + right.z);
  }
  for (let i = 0; i < p.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "RigGroundCourseRibbon";
  mesh.receiveShadow = false;
  return mesh;
}

function buildAirGate(point, materials) {
  const gate = new THREE.Group();
  gate.name = point.id;
  gate.position.set(...point.positionMetres);
  gate.rotation.y = point.yawRadians;

  const width = CONFIG.harness.airGateWidthMetres;
  const height = CONFIG.harness.airGateHeightMetres;
  const bar = 0.28;
  const postGeometry = new THREE.BoxGeometry(bar, height, bar);
  const topGeometry = new THREE.BoxGeometry(width, bar, bar);
  const left = new THREE.Mesh(postGeometry, materials.airGate);
  const right = new THREE.Mesh(postGeometry, materials.airGate);
  const top = new THREE.Mesh(topGeometry, materials.airGate);
  left.position.set(-width / 2, 0, 0);
  right.position.set(width / 2, 0, 0);
  top.position.set(0, height / 2, 0);
  gate.add(left, right, top);

  const beaconGeometry = new THREE.SphereGeometry(0.38, 12, 8);
  const beacon = new THREE.Mesh(beaconGeometry, materials.beacon);
  beacon.position.set(0, height / 2, 0);
  gate.add(beacon);
  return gate;
}

function buildCalibrationProbe(materials) {
  const spec = CONFIG.calibrationProbe;
  const group = new THREE.Group();
  group.name = "HarnessCalibrationProbe";

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(spec.widthMetres, spec.heightMetres, spec.lengthMetres),
    materials.probe,
  );
  body.position.y = spec.heightMetres / 2;
  group.add(body);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(spec.widthMetres * 0.42, spec.lengthMetres * 0.3, 4),
    materials.probe,
  );
  nose.rotation.x = Math.PI / 2;
  nose.rotation.z = Math.PI / 4;
  nose.position.set(0, spec.heightMetres / 2, spec.lengthMetres * 0.62);
  group.add(nose);

  group.position.set(
    CONFIG.groundCourse[0].positionMetres[0],
    CONFIG.calibrationProbe.hoverHeightMetres,
    CONFIG.groundCourse[0].positionMetres[2],
  );
  return group;
}

export function buildProvingGround(scene, { probe: suppliedProbe = null } = {}) {
  const materials = {
    ground: surface("asphalt", { grime: 0.18, dust: 0.12 }),
    course: surface("concrete", { grime: 0.24, dust: 0.2 }),
    marker: new THREE.MeshBasicMaterial({ color: 0x7ed6bd }),
    airGate: new THREE.MeshBasicMaterial({ color: 0x5ea6bf }),
    beacon: new THREE.MeshBasicMaterial({ color: 0xe5b85c }),
    probe: new THREE.MeshBasicMaterial({ color: 0xe9f7fb, wireframe: true }),
  };

  const rig = new THREE.Group();
  rig.name = "SpaceshipHarness";

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.sizeMetres, CONFIG.world.sizeMetres),
    materials.ground,
  );
  ground.name = "RigGroundPlane";
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  rig.add(ground);

  const ribbon = makeCourseRibbon(
    CONFIG.groundCourse,
    CONFIG.harness.groundCourseWidthMetres,
    materials.course,
  );
  rig.add(ribbon);

  const markerGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.1, 18);
  for (const point of CONFIG.groundCourse.slice(0, -1)) {
    const marker = new THREE.Mesh(markerGeometry, materials.marker);
    marker.name = point.id;
    marker.position.set(...point.positionMetres);
    marker.position.y += 0.08;
    rig.add(marker);
  }

  for (const point of CONFIG.airRoute) rig.add(buildAirGate(point, materials));

  const groundRouteLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      CONFIG.groundCourse.map((p) => new THREE.Vector3(...p.positionMetres).setY(0.16)),
    ),
    new THREE.LineBasicMaterial({ color: 0xa9f1d3 }),
  );
  groundRouteLine.name = "GroundRouteDataLine";
  rig.add(groundRouteLine);

  const airRouteLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      CONFIG.airRoute.map((p) => new THREE.Vector3(...p.positionMetres)),
    ),
    new THREE.LineDashedMaterial({ color: 0x75cce6, dashSize: 1.2, gapSize: 0.75 }),
  );
  airRouteLine.computeLineDistances();
  airRouteLine.name = "AirRouteDataLine";
  rig.add(airRouteLine);

  const probe = suppliedProbe || buildCalibrationProbe(materials);
  if (suppliedProbe) {
    probe.name = "HeroShipRigVehicle";
    probe.position.set(
      CONFIG.groundCourse[0].positionMetres[0],
      CONFIG.calibrationProbe.hoverHeightMetres,
      CONFIG.groundCourse[0].positionMetres[2],
    );
  }
  rig.add(probe);
  scene.add(rig);
  scene.updateMatrixWorld(true);

  registerAsset(ribbon, "groundCourse", { flags: { rig: true, dataDriven: true } });
  for (const gate of rig.children.filter((child) => /^AIR-/.test(child.name))) {
    registerAsset(gate, "airGate", { flags: { rig: true, dataDriven: true } });
  }
  registerAsset(probe, suppliedProbe ? "heroShipRigVehicle" : "calibrationProbe", {
    flags: suppliedProbe ? { rig: true, heroShip: true } : { rig: true, notShipDesign: true },
  });

  return { rig, probe, materials };
}

// Fixed, deliberately plain light rig. It is installed after surfaces and form
// and has no shadows at this stage; silhouette decisions must not be disguised
// as lighting changes.
export function installDiagnosticLights(scene) {
  scene.add(new THREE.HemisphereLight(0xdcecf2, 0x2a3236, 1.15));
  const key = new THREE.DirectionalLight(0xfff4df, 1.8);
  key.position.set(24, 38, -18);
  key.castShadow = false;
  key.name = "FixedDiagnosticKey";
  scene.add(key);
  return key;
}

export class RigSimulation {
  constructor({ scene, probe, camera, renderer }) {
    this.scene = scene;
    this.probe = probe;
    this.camera = camera;
    this.renderer = renderer;
    this.state = {
      time: 0,
      mode: "hover",
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      nextWaypointIndex: 1,
    };
    this.focus = new THREE.Vector3();
    this.trace = [];
    this.clampCorrections = 0;
    this.reset();
  }

  reset() {
    const start = CONFIG.groundCourse[0].positionMetres;
    this.state.time = 0;
    this.state.mode = "hover";
    this.state.position.set(start[0], CONFIG.calibrationProbe.hoverHeightMetres, start[2]);
    this.state.velocity.set(0, 0, 0);
    this.state.yaw = 0;
    this.state.pitch = 0;
    this.state.nextWaypointIndex = 1;
    this.trace.length = 0;
    this.clampCorrections = 0;
    this.applyProbePose();
    this.placeCameraImmediate();
    this.render();
  }

  inputAt(scenarioName, time) {
    const phases = CONFIG.scenarios[scenarioName];
    if (!phases) throw new Error(`Unknown scenario: ${scenarioName}`);
    const phase = phases.find((item) => time < item.untilSeconds) || phases.at(-1);
    return {
      mode: phase.mode,
      throttle: phase.throttle,
      steer: phase.steer,
      pitch: phase.pitch,
      climb: phase.climb,
      brake: phase.brake,
    };
  }

  step(input, dt = CONFIG.simulation.fixedDtSeconds, shouldRecord = true, shouldRender = true) {
    if (input.mode !== this.state.mode) {
      this.state.mode = input.mode;
      this.state.nextWaypointIndex = input.mode === "flight" ? 0 : 1;
    }
    if (this.state.mode === "flight") this.stepFlight(input, dt);
    else this.stepHover(input, dt);

    this.state.time += dt;
    this.advanceWaypoint();
    this.applyProbePose();
    const screen = this.updateCamera(dt);
    if (shouldRecord) this.record(input, screen, dt);
    if (shouldRender) this.render();
    return screen;
  }

  stepHover(input, dt) {
    const c = CONFIG.controls.hover;
    const forward = new THREE.Vector3(Math.sin(this.state.yaw), 0, Math.cos(this.state.yaw));
    const speed = this.state.velocity.dot(forward);
    const targetSpeed = input.throttle * c.maxForwardSpeedMetresPerSecond;
    const rate = input.brake > 0
      ? c.brakingMetresPerSecond2
      : (Math.abs(targetSpeed) > Math.abs(speed)
        ? c.driveAccelerationMetresPerSecond2
        : c.coastDecelerationMetresPerSecond2);
    const nextSpeed = moveToward(speed, targetSpeed, rate * dt);
    const authority = THREE.MathUtils.lerp(
      c.lowSpeedSteeringFraction,
      1,
      THREE.MathUtils.clamp(Math.abs(nextSpeed) / c.fullSteeringSpeedMetresPerSecond, 0, 1),
    );
    this.state.yaw += input.steer * c.maxYawRateRadiansPerSecond * authority * dt;
    forward.set(Math.sin(this.state.yaw), 0, Math.cos(this.state.yaw));
    this.state.velocity.copy(forward.multiplyScalar(nextSpeed));
    this.state.position.addScaledVector(this.state.velocity, dt);
    this.state.position.y = CONFIG.calibrationProbe.hoverHeightMetres;
    this.state.pitch = 0;
  }

  stepFlight(input, dt) {
    const c = CONFIG.controls.flight;
    this.state.yaw += input.steer * c.maxYawRateRadiansPerSecond * dt;
    this.state.pitch = THREE.MathUtils.clamp(
      this.state.pitch + input.pitch * c.maxPitchRateRadiansPerSecond * dt,
      -0.55,
      0.55,
    );
    const forward = new THREE.Vector3(
      Math.sin(this.state.yaw) * Math.cos(this.state.pitch),
      Math.sin(this.state.pitch),
      Math.cos(this.state.yaw) * Math.cos(this.state.pitch),
    );
    this.state.velocity.addScaledVector(forward, input.throttle * c.thrustAccelerationMetresPerSecond2 * dt);
    this.state.velocity.y += input.climb * c.climbAccelerationMetresPerSecond2 * dt;
    if (input.brake > 0) {
      const speed = this.state.velocity.length();
      this.state.velocity.setLength(Math.max(0, speed - c.brakingMetresPerSecond2 * input.brake * dt));
    }
    this.state.velocity.multiplyScalar(Math.exp(-c.dragPerSecond * dt));
    if (this.state.velocity.length() > c.maxForwardSpeedMetresPerSecond) {
      this.state.velocity.setLength(c.maxForwardSpeedMetresPerSecond);
    }
    this.state.position.addScaledVector(this.state.velocity, dt);
  }

  applyProbePose() {
    this.probe.position.copy(this.state.position);
    this.probe.rotation.order = "YXZ";
    this.probe.rotation.set(-this.state.pitch, this.state.yaw, 0);
    this.probe.updateMatrixWorld(true);
  }

  desiredCamera() {
    const c = CONFIG.followCamera;
    const forward = new THREE.Vector3(Math.sin(this.state.yaw), 0, Math.cos(this.state.yaw));
    const positionLead = this.state.velocity.clone().multiplyScalar(c.positionFeedForwardSeconds);
    const focusLead = this.state.velocity.clone().multiplyScalar(c.focusFeedForwardSeconds);
    if (positionLead.length() > c.maxFeedForwardMetres) positionLead.setLength(c.maxFeedForwardMetres);
    if (focusLead.length() > c.maxFeedForwardMetres) focusLead.setLength(c.maxFeedForwardMetres);
    const position = this.state.position.clone()
      .addScaledVector(forward, -c.followDistanceMetres)
      .addScaledVector(UP, c.heightMetres)
      .add(positionLead);
    const focus = this.state.position.clone()
      .addScaledVector(UP, c.focusHeightMetres)
      .add(focusLead);
    return { position, focus };
  }

  placeCameraImmediate() {
    const desired = this.desiredCamera();
    this.camera.position.copy(desired.position);
    this.focus.copy(desired.focus);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld(true);
  }

  updateCamera(dt) {
    const c = CONFIG.followCamera;
    const desired = this.desiredCamera();
    const posAlpha = 1 - Math.exp(-c.positionDampingLambda * dt);
    const focusAlpha = 1 - Math.exp(-c.focusDampingLambda * dt);
    this.camera.position.lerp(desired.position, posAlpha);
    this.focus.lerp(desired.focus, focusAlpha);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld(true);

    const before = this.state.position.clone().project(this.camera);
    if (Math.abs(before.x) > c.screenClampNdc || Math.abs(before.y) > c.screenClampNdc) {
      // Screen-space containment is a backstop, not the primary follow rule.
      // Re-aiming at the measured ship position guarantees recovery in the same
      // fixed step instead of letting sustained input push it off-screen.
      this.focus.copy(this.state.position);
      this.camera.lookAt(this.focus);
      this.camera.updateMatrixWorld(true);
      this.clampCorrections += 1;
    }
    const after = this.state.position.clone().project(this.camera);
    return {
      x: round(after.x),
      y: round(after.y),
      z: round(after.z),
      visible: Math.abs(after.x) <= 1 && Math.abs(after.y) <= 1 && after.z >= -1 && after.z <= 1,
      beforeClampX: round(before.x),
      beforeClampY: round(before.y),
    };
  }

  advanceWaypoint() {
    const route = this.state.mode === "flight" ? CONFIG.airRoute : CONFIG.groundCourse;
    const index = Math.min(this.state.nextWaypointIndex, route.length - 1);
    const target = new THREE.Vector3(...route[index].positionMetres);
    if (this.state.position.distanceTo(target) < 7 && index < route.length - 1) {
      this.state.nextWaypointIndex = index + 1;
    }
  }

  intendedWaypoint() {
    const route = this.state.mode === "flight" ? CONFIG.airRoute : CONFIG.groundCourse;
    const index = Math.min(this.state.nextWaypointIndex, route.length - 1);
    return route[index];
  }

  record(input, screen, dt) {
    const target = this.intendedWaypoint();
    this.trace.push({
      tSeconds: round(this.state.time),
      dtSeconds: round(dt),
      input: { ...input },
      mode: this.state.mode,
      positionMetres: vec(this.state.position),
      velocityMetresPerSecond: vec(this.state.velocity),
      orientationQuaternion: quat(this.probe.quaternion),
      intendedWaypoint: { id: target.id, positionMetres: [...target.positionMetres] },
      screenNdc: screen,
    });
  }

  runScenario(name, seconds = CONFIG.simulation.defaultScenarioSeconds) {
    this.reset();
    const dt = CONFIG.simulation.fixedDtSeconds;
    const steps = Math.round(seconds / dt);
    let maxX = { value: 0, time: 0 };
    let maxY = { value: 0, time: 0 };
    for (let i = 0; i < steps; i++) {
      const input = this.inputAt(name, this.state.time);
      const screen = this.step(input, dt, true, false);
      if (Math.abs(screen.x) > maxX.value) maxX = { value: Math.abs(screen.x), time: this.state.time };
      if (Math.abs(screen.y) > maxY.value) maxY = { value: Math.abs(screen.y), time: this.state.time };
    }
    this.render();
    return {
      scenario: name,
      fixedDtSeconds: dt,
      simulatedSeconds: round(this.state.time),
      samples: this.trace.length,
      maxAbsNdcX: round(maxX.value),
      maxAbsNdcXAtSeconds: round(maxX.time),
      maxAbsNdcY: round(maxY.value),
      maxAbsNdcYAtSeconds: round(maxY.time),
      thresholdNdc: CONFIG.followCamera.screenClampNdc,
      passed: maxX.value < 0.35 && maxY.value < 0.35,
      screenClampCorrections: this.clampCorrections,
      trace: this.trace,
    };
  }

  runScenarioToTime(name, seconds) {
    this.reset();
    const dt = CONFIG.simulation.fixedDtSeconds;
    const steps = Math.round(seconds / dt);
    for (let i = 0; i < steps; i++) {
      this.step(this.inputAt(name, this.state.time), dt, false, false);
    }
    this.render();
    return {
      scenario: name,
      tSeconds: round(this.state.time),
      positionMetres: vec(this.state.position),
      velocityMetresPerSecond: vec(this.state.velocity),
      mode: this.state.mode,
    };
  }

  traceJSON() {
    return JSON.stringify({
      schema: "worldbuilding-lab/control-trace/v1",
      coordinateSystem: { forward: "+Z", up: "+Y", right: "+X" },
      fixedDtSeconds: CONFIG.simulation.fixedDtSeconds,
      samples: this.trace,
    }, null, 2);
  }

  render() {
    this.renderer.setScissorTest(false);
    // WebGLRenderer multiplies viewport values by devicePixelRatio internally;
    // pass CSS pixels here. Passing the drawing-buffer dimensions doubled the
    // mobile viewport at DPR 2 and pushed the probe to the edge of frame.
    this.renderer.setViewport(
      0,
      0,
      this.renderer.domElement.clientWidth,
      this.renderer.domElement.clientHeight,
    );
    this.renderer.render(this.scene, this.camera);
  }
}

export function createSceneReport({ renderer, probe, simulation }) {
  return function sceneReport() {
    const addresses = addressReport();
    const box = new THREE.Box3().setFromObject(probe);
    const size = box.getSize(new THREE.Vector3());
    const info = renderer.info;
    return {
      generatedAt: new Date().toISOString(),
      world: {
        sizeMetres: CONFIG.world.sizeMetres,
        moduleMetres: CONFIG.world.gridModuleMetres,
        up: [...CONFIG.world.up],
      },
      counts: {
        assets: addresses.count,
        issues: 0,
        groundWaypoints: CONFIG.groundCourse.length,
        airGates: CONFIG.airRoute.length,
      },
      issues: [],
      assets: addresses.assets,
      calibrationProbe: {
        address: gridAddress(probe.position.x, probe.position.z),
        sizeMetres: vec(size),
        positionMetres: vec(simulation.state.position),
        note: "Harness calibration probe; not a ship silhouette option.",
      },
      render: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      materials: surfaceReport(),
    };
  };
}
