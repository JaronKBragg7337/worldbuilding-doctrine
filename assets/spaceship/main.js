import * as THREE from "three";
import { configureGrid, registerAsset } from "../../lib/v1/address.js";
import {
  loadSurfaces,
  setTextureBase,
  surfaceReport,
} from "../../lib/v1/surface.js";
import { CONFIG } from "./config.js";
import { CrewController } from "./crew.js";
import {
  buildShipMaterials,
  installSpaceshipMaterialCards,
  spaceshipMaterialReport,
} from "./materials.js";
import {
  buildProvingGround,
  createSceneReport,
  installDiagnosticLights,
  RigSimulation,
} from "./rig.js";
import { buildHeroShip, installShipUtilityLights } from "./ship.js";
import { HeroShipStage } from "./ship-stage.js";
import { SilhouetteStage } from "./silhouette-stage.js";
import { buildSilhouetteOptions, silhouetteReport } from "./silhouettes.js";

const qs = new URLSearchParams(location.search);
const dev = qs.get("dev") === "1" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

const canvas = document.getElementById("game");
const telemetry = document.getElementById("telemetry");
const status = document.getElementById("status");
const eyebrow = document.getElementById("eyebrow");
const assetTitle = document.getElementById("asset-title");
const subtitle = document.getElementById("subtitle");
const labelLayer = document.getElementById("view-labels");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CONFIG.render.maxDevicePixelRatio));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.render.toneMappingExposure;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.render.clearColor);
scene.fog = new THREE.Fog(
  CONFIG.render.fogColor,
  CONFIG.render.fogNearMetres,
  CONFIG.render.fogFarMetres,
);

const camera = new THREE.PerspectiveCamera(
  CONFIG.followCamera.fovDegrees,
  innerWidth / innerHeight,
  CONFIG.followCamera.nearMetres,
  CONFIG.followCamera.farMetres,
);
camera.rotation.order = "YXZ";

configureGrid({
  module: CONFIG.world.gridModuleMetres,
  size: CONFIG.world.sizeMetres,
});
setTextureBase("../../textures/");

// The order is enforced, not aspirational: register and load all projected PBR
// cards first; build form second; install the fixed light rig last.
installSpaceshipMaterialCards();
await loadSurfaces(renderer);
const materials = buildShipMaterials();
const ship = buildHeroShip(materials);
scene.add(ship.root);

// The flight rig uses a geometry-sharing exterior clone of the selected ship,
// not the old wireframe calibration box. Interior visibility is already off in
// exterior mode, so the clone carries the authored silhouette at bounded cost.
const rigVehicle = ship.root.clone(true);
rigVehicle.name = "SHIP-B2-RigVehicle";
rigVehicle.getObjectByName("CREW-REFERENCE-1P80").visible = false;
const { rig, probe } = buildProvingGround(scene, { probe: rigVehicle });

const silhouettes = buildSilhouetteOptions();
scene.add(silhouettes.root);
for (const [key, option] of silhouettes.options) {
  registerAsset(option.group, `silhouette${key}`, {
    flags: { reviewOnly: true, primaryForm: true, selected: key === "B" },
  });
}

// Lighting remains the last construction step. These are unchanged diagnostic
// lights: no shadows and no tuning pass intended to rescue material/form.
installDiagnosticLights(scene);
installShipUtilityLights(ship);
scene.updateMatrixWorld(true);

const simulation = new RigSimulation({ scene, probe, camera, renderer });
const rigSceneReport = createSceneReport({ renderer, probe, simulation });
const silhouetteStage = new SilhouetteStage({
  renderer,
  scene,
  rig,
  root: silhouettes.root,
  options: silhouettes.options,
  labelLayer,
});
silhouetteStage.setOption("B");
const stage = new HeroShipStage({
  renderer,
  scene,
  camera,
  rig,
  ship,
  silhouettes,
  silhouetteStage,
});

const crew = new CrewController({
  camera,
  canvas,
  ship,
  onStateChange: () => {
    if (stage.mode === "walk") {
      updateTelemetry();
      updateHeader();
    }
  },
});

function stats() {
  const info = renderer.info;
  let visibleMeshes = 0;
  scene.traverseVisible((object) => { if (object.isMesh) visibleMeshes += 1; });
  return {
    calls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs?.length || 0,
    visibleMeshes,
    view: stage.mode,
  };
}

function combinedSceneReport() {
  return {
    ...rigSceneReport(),
    heroShip: ship.report(),
    shipUtilityLights: ship.utilityLightReport(),
    shipMaterials: spaceshipMaterialReport(),
    crew: crew.report(),
    stage: stage.report(),
    silhouettes: silhouetteReport(silhouettes.options),
    view: stage.mode,
  };
}

function reportText() {
  const report = combinedSceneReport();
  const envelope = report.heroShip.operationalEnvelopeMeasured.dimensionsMetres;
  return [
    `${report.heroShip.name} · selected silhouette ${report.heroShip.selectedSilhouette}`,
    `operational envelope ${envelope[0]} × ${envelope[1]} × ${envelope[2]} m`,
    `${report.heroShip.decks.length} decks · ${report.heroShip.crewStations.length} crew stations · ${report.heroShip.weapons.length} guns`,
    `crew routes ${report.heroShip.routes.length} · gate ${report.heroShip.routeGatePassed ? "PASS" : "FAIL"}`,
    `draw calls ${report.render.calls} · triangles ${report.render.triangles}`,
  ].join("\n");
}

function updateButtons() {
  for (const button of document.querySelectorAll("[data-view-mode]")) {
    button.dataset.active = String(button.dataset.viewMode === stage.mode);
  }
  for (const button of document.querySelectorAll("[data-crew-station]")) {
    button.dataset.active = String(Boolean(crew.occupantAt(button.dataset.crewStation)));
  }
}

function weaponLine(weapon) {
  const state = weapon.available ? "READY" : "EMPTY";
  return `${weapon.id.replace("WPN-", "").padEnd(11)} ${state}`;
}

function updateTelemetry() {
  if (stage.mode === "rig") {
    const info = renderer.info;
    telemetry.innerHTML =
      `<strong>fixed dt</strong>  ${(CONFIG.simulation.fixedDtSeconds * 1000).toFixed(2)} ms\n` +
      `<strong>vehicle</strong>   selected B2 hull\n` +
      `<strong>ground</strong>    ${CONFIG.groundCourse.length} waypoints\n` +
      `<strong>air</strong>       ${CONFIG.airRoute.length} gates\n` +
      `<strong>draw calls</strong> ${info.render.calls}\n` +
      `<strong>triangles</strong>  ${info.render.triangles.toLocaleString()}`;
    return;
  }
  if (stage.mode === "walk") {
    const state = crew.report();
    telemetry.innerHTML =
      `<strong>${state.mode}</strong> · ${state.deck}\n` +
      `<strong>position</strong> ${state.positionMetres.join(", ")} m\n` +
      `${state.weapons.map(weaponLine).join("\n")}\n` +
      `<strong>E</strong> use / sit · <strong>Q</strong> leave seat`;
    return;
  }
  const report = ship.report();
  const d = report.operationalEnvelopeMeasured.dimensionsMetres;
  telemetry.innerHTML =
    `<strong>envelope</strong>   ${d[0].toFixed(2)} × ${d[1].toFixed(2)} × ${d[2].toFixed(2)} m\n` +
    `<strong>decks</strong>      ${report.decks.length} · clear ${report.circulation.deckClearHeightsMetres.join(" / ")} m\n` +
    `<strong>rooms</strong>      ${report.decks.reduce((sum, deck) => sum + deck.rooms.length, 0)}\n` +
    `<strong>stations</strong>   ${report.crewStations.filter((item) => item.seat).length} seats · ${report.weapons.length} guns\n` +
    `<strong>routes</strong>     ${report.routeGatePassed ? "PASS" : "FAIL"} · ${report.routes.map((route) => route.lengthMetres).join(" / ")} m`;
}

function updateHeader() {
  const mode = stage.mode;
  if (mode === "rig") {
    eyebrow.textContent = "Pass 01 · enforcement layer";
    assetTitle.textContent = "Selected ship proving ground";
    subtitle.textContent = "Fixed-step traces · sustained-input camera gate · B2 exterior under test";
    status.textContent = "Run a deterministic flight scenario";
    return;
  }
  if (mode === "archive") {
    eyebrow.textContent = "Decision archive · primary form";
    assetTitle.textContent = "B · Split-keel Courier";
    subtitle.textContent = "Original undetailed orthographic option retained for comparison";
    status.textContent = "Selection locked · this is not the current detailed build";
    return;
  }
  if (mode === "walk") {
    const state = crew.report();
    eyebrow.textContent = "Walkable crew loop";
    assetTitle.textContent = state.localStationId || `${state.deck} · on foot`;
    subtitle.textContent = state.lastAction;
    const unavailable = state.weapons.filter((weapon) => !weapon.available && weapon.requiresDedicatedOperator).length;
    status.textContent = `${unavailable} teammate gun${unavailable === 1 ? "" : "s"} currently unmanned`;
    return;
  }
  const labels = {
    exterior: ["Pass 03 · selected secondary form", "Split-keel Courier B2", `Fixed turntable ${stage.turntableAngleDegrees}° · selected hull + functional exterior masses`],
    engines: ["Exterior systems · propulsion", "Three-axis drive cluster", "Dominant underslung main bell · independent boom engines · exposed service channels"],
    cutaway: ["Pass 04 · circulation proof", "Two-deck cutaway", "Room-to-room route · separate ladder and elevator · physical gun chairs"],
    cockpit: ["Pass 05 · cockpit", "Pilot / assisted-gun seat", "Pilot retains the chin repeater; other turrets remain physically remote"],
    corridor: ["Pass 06 · upper deck", "Walk to the flight seat", "Main corridor looking aft through the systems cross-bridge"],
    lower: ["Pass 06 · lower deck", "Operations corridor", "Cargo · crew galley · engineering · ventral gun · starboard airlock"],
    dorsal: ["Crew station · dedicated weapon", "Dorsal gunner chair", "This cannon is unavailable until a crew member physically occupies this seat"],
    ventral: ["Crew station · dedicated weapon", "Ventral gunner chair", "A solo pilot must leave the flight seat and walk down here to operate it"],
  };
  const [pass, title, sub] = labels[mode] || labels.exterior;
  eyebrow.textContent = pass;
  assetTitle.textContent = title;
  subtitle.textContent = sub;
  status.textContent = ship.report().routeGatePassed
    ? "Configured crew routes are geometrically navigable · PASS"
    : "Crew route gate failed · inspect report";
}

function renderCurrent() {
  if (stage.mode === "rig") simulation.render();
  else stage.render();
}

function setView(mode) {
  stage.setMode(mode);
  document.body.dataset.view = mode;
  labelLayer.hidden = mode !== "archive";
  crew.setEnabled(mode === "walk");
  if (mode !== "rig") delete status.dataset.state;
  updateButtons();
  updateHeader();
  updateTelemetry();
  renderCurrent();
  return mode;
}

function setTurntableAngle(degrees) {
  const angle = stage.setTurntableAngle(degrees);
  setView("exterior");
  return angle;
}

function stepTurntableAngle(direction) {
  const angle = stage.stepTurntable(direction);
  setView("exterior");
  return angle;
}

function runScenario(name) {
  setView("rig");
  for (const button of document.querySelectorAll("[data-scenario]")) {
    button.dataset.active = String(button.dataset.scenario === name);
  }
  const result = simulation.runScenario(name);
  status.dataset.state = result.passed ? "pass" : "fail";
  status.textContent = result.passed
    ? `${name}: max NDC (${result.maxAbsNdcX}, ${result.maxAbsNdcY}) · PASS`
    : `${name}: max NDC (${result.maxAbsNdcX}, ${result.maxAbsNdcY}) · FAIL`;
  updateTelemetry();
  return result;
}

function toggleRemoteCrew(stationId) {
  const occupied = Boolean(crew.occupantAt(stationId));
  const result = crew.setRemoteCrew(stationId, !occupied, stationId === "STN-DORSAL" ? "teammate-dorsal" : "teammate-ventral");
  updateButtons();
  updateTelemetry();
  updateHeader();
  return result;
}

function runCrewScenario() {
  crew.reset();
  crew.occupyStation("STN-PILOT");
  const soloPilot = crew.weaponState();
  crew.setRemoteCrew("STN-DORSAL", true, "teammate-1");
  const paired = crew.weaponState();
  crew.setRemoteCrew("STN-DORSAL", false);
  crew.leaveStation();
  crew.occupyStation("STN-VENTRAL");
  const soloMoved = crew.weaponState();
  const available = (state, id) => state.find((weapon) => weapon.id === id).available;
  const result = {
    scenario: "physical-gun-stations",
    soloPilot,
    paired,
    soloMoved,
    assertions: {
      pilotHasAssistedGun: available(soloPilot, "WPN-CHIN-01"),
      soloPilotCannotUseDorsal: !available(soloPilot, "WPN-DORSAL-01"),
      teammateEnablesDorsal: available(paired, "WPN-DORSAL-01"),
      leavingPilotDisablesChin: !available(soloMoved, "WPN-CHIN-01"),
      movingToVentralEnablesVentral: available(soloMoved, "WPN-VENTRAL-01"),
    },
  };
  result.passed = Object.values(result.assertions).every(Boolean) && ship.report().routeGatePassed;
  crew.reset();
  return result;
}

function runMechanismScenario() {
  const dt = 1 / 60;
  const door = ship.interior.doors[0];
  const elevator = ship.interior.elevator;
  const advance = (mechanism, seconds) => {
    const steps = Math.ceil((seconds + dt) / dt);
    for (let index = 0; index < steps; index += 1) mechanism.update(dt);
    return +(steps * dt).toFixed(3);
  };

  door.setOpen(false, true);
  const doorClosed = door.report();
  door.setOpen(true);
  const doorElapsedSeconds = advance(door, door.seconds);
  const doorOpen = door.report();
  const doorLeafTravelMetres = +Math.abs(
    door.leaves[0].position[door.axis] - door.closed[0][door.axis],
  ).toFixed(3);

  elevator.setDeck("L1", true);
  const lowerStartYMetres = +elevator.group.position.y.toFixed(3);
  elevator.setDeck("L2");
  const elevatorUpElapsedSeconds = advance(elevator, elevator.seconds);
  const upperArrival = elevator.report();
  const upperArrivalYMetres = +elevator.group.position.y.toFixed(3);
  elevator.setDeck("L1");
  const elevatorDownElapsedSeconds = advance(elevator, elevator.seconds);
  const lowerReturn = elevator.report();
  const lowerReturnYMetres = +elevator.group.position.y.toFixed(3);

  const near = (a, b) => Math.abs(a - b) < 0.001;
  const result = {
    scenario: "room-to-room-mechanisms",
    door: {
      id: door.id,
      configuredTravelSeconds: door.seconds,
      measuredElapsedSeconds: doorElapsedSeconds,
      measuredLeafTravelMetres: doorLeafTravelMetres,
      closed: doorClosed,
      open: doorOpen,
    },
    elevator: {
      id: elevator.id,
      configuredTravelSeconds: elevator.seconds,
      measuredUpElapsedSeconds: elevatorUpElapsedSeconds,
      measuredDownElapsedSeconds: elevatorDownElapsedSeconds,
      lowerStartYMetres,
      upperArrivalYMetres,
      lowerReturnYMetres,
      upperArrival,
      lowerReturn,
    },
    assertions: {
      doorStartedClosed: doorClosed.openFraction === 0 && !doorClosed.targetOpen,
      doorReachedOpen: doorOpen.openFraction === 1 && doorOpen.targetOpen,
      doorLeavesPhysicallyMoved: near(doorLeafTravelMetres, door.travelMetres),
      elevatorStartedAtLowerDeck: near(lowerStartYMetres, elevator.lowerY),
      elevatorReachedUpperDeck: upperArrival.travelFraction === 1 && near(upperArrivalYMetres, elevator.upperY),
      elevatorReturnedToLowerDeck: lowerReturn.travelFraction === 0 && near(lowerReturnYMetres, elevator.lowerY),
    },
  };
  result.passed = Object.values(result.assertions).every(Boolean);

  // Leave the interactive page in its authored starting state.
  door.setOpen(true, true);
  elevator.setDeck("L1", true);
  return result;
}

function measureSilhouetteOption(key) {
  const previousView = stage.mode;
  const previousKey = silhouetteStage.activeKey;
  stage.setMode("archive");
  silhouetteStage.setOption(key);
  silhouetteStage.setMode("turntable");
  silhouetteStage.renderComparisonCamera();
  const option = silhouettes.options.get(key);
  const result = {
    key,
    name: option.spec.name,
    camera: {
      positionMetres: [...CONFIG.harness.wideCameraPositionMetres],
      targetMetres: [...CONFIG.harness.wideCameraTargetMetres],
      viewportCssPixels: [canvas.clientWidth, canvas.clientHeight],
    },
    geometry: option.measurement,
    render: { ...stats(), view: "fixed-comparison" },
  };
  silhouetteStage.setOption(previousKey);
  stage.setMode(previousView);
  return result;
}

function measureAllSilhouettes() {
  return [...silhouettes.options.keys()].map(measureSilhouetteOption);
}

function measureShipView(mode = "exterior") {
  const previous = stage.mode;
  stage.setMode(mode);
  stage.render();
  const result = {
    mode,
    camera: {
      positionMetres: camera.position.toArray().map((value) => +value.toFixed(3)),
      viewportCssPixels: [canvas.clientWidth, canvas.clientHeight],
    },
    render: stats(),
    ship: ship.report(),
  };
  stage.setMode(previous);
  return result;
}

for (const button of document.querySelectorAll("[data-view-mode]")) {
  button.addEventListener("click", () => setView(button.dataset.viewMode));
}
for (const button of document.querySelectorAll("[data-angle-step]")) {
  button.addEventListener("click", () => stepTurntableAngle(button.dataset.angleStep));
}
for (const button of document.querySelectorAll("[data-scenario]")) {
  button.addEventListener("click", () => runScenario(button.dataset.scenario));
}
for (const button of document.querySelectorAll("[data-crew-station]")) {
  button.addEventListener("click", () => toggleRemoteCrew(button.dataset.crewStation));
}

function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CONFIG.render.maxDevicePixelRatio));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderCurrent();
}
addEventListener("resize", resize);

let frames = 0;
let lastFrameSeconds = performance.now() / 1000;
function tick(nowMs) {
  const nowSeconds = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0, nowSeconds - lastFrameSeconds));
  lastFrameSeconds = nowSeconds;
  ship.update(dt);
  crew.update(dt);
  renderCurrent();
  if (++frames % 20 === 0) updateTelemetry();
  requestAnimationFrame(tick);
}

if (dev) {
  window.LAB = {
    CONFIG,
    THREE,
    scene,
    camera,
    renderer,
    rig,
    probe,
    simulation,
    ship,
    materials,
    crew,
    stage,
    silhouettes,
    silhouetteStage,
    surfaceReport,
    spaceshipMaterialReport,
    silhouetteReport: () => silhouetteReport(silhouettes.options),
    shipReport: ship.report,
    crewReport: () => crew.report(),
    sceneReport: combinedSceneReport,
    reportText,
    stats,
    setView,
    setTurntableAngle,
    stepTurntableAngle,
    runScenario,
    runScenarioToTime: (name, seconds) => simulation.runScenarioToTime(name, seconds),
    traceJSON: () => simulation.traceJSON(),
    runCrewScenario,
    runMechanismScenario,
    toggleRemoteCrew,
    occupyStation: (id) => crew.occupyStation(id),
    leaveStation: () => crew.leaveStation(),
    measureSilhouetteOption,
    measureAllSilhouettes,
    measureShipView,
    measureFixedWideShip: () => stage.renderFixedWide(),
  };
}

simulation.reset();
stage.turntableAngleDegrees = Number(qs.get("angle")) || 135;
const requestedView = qs.get("view");
setView(new Set(["exterior", "engines", "cutaway", "cockpit", "corridor", "lower", "dorsal", "ventral", "walk", "rig", "archive"]).has(requestedView)
  ? requestedView
  : "exterior");
console.log("[LAB] realism kit loaded — selected split-keel hero ship ready");
requestAnimationFrame(tick);
