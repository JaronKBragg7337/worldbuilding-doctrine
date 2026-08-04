import * as THREE from "three";
import { CONFIG } from "./config.js";

const SHIP = CONFIG.ship;
const round = (value) => +value.toFixed(3);

function deckById(id) {
  const deck = SHIP.decks.find((item) => item.id === id);
  if (!deck) throw new Error(`Unknown deck: ${id}`);
  return deck;
}

function stationById(id) {
  const station = SHIP.stations.find((item) => item.id === id);
  if (!station) throw new Error(`Unknown station: ${id}`);
  return station;
}

function xzDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export class CrewController {
  constructor({ camera, canvas, ship, onStateChange = () => {} }) {
    this.camera = camera;
    this.canvas = canvas;
    this.ship = ship;
    this.onStateChange = onStateChange;
    this.enabled = false;
    this.keys = new Set();
    this.virtualKeys = new Set();
    this.deckId = SHIP.onFoot.startDeck;
    this.position = new THREE.Vector3(...SHIP.onFoot.startPositionMetres);
    this.heading = SHIP.onFoot.startYawRadians;
    this.pitch = 0;
    this.dragging = false;
    this.lastPointer = new THREE.Vector2();
    this.localStationId = null;
    this.remoteCrew = new Map();
    this.ridingElevator = false;
    this.elevatorDestination = null;
    this.lastAction = "Outside the starboard airlock · open the marked door to board";
    this.installInput();
    this.syncCamera();
  }

  installInput() {
    addEventListener("keydown", (event) => {
      if (!this.enabled) return;
      this.keys.add(event.code);
      if (event.code === "KeyE" && !event.repeat) {
        event.preventDefault();
        this.interact();
      }
      if (event.code === "KeyQ" && this.localStationId && !event.repeat) {
        event.preventDefault();
        this.leaveStation();
      }
    });
    addEventListener("keyup", (event) => this.keys.delete(event.code));
    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.lastPointer.set(event.clientX, event.clientY);
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.enabled || !this.dragging) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.lastPointer.set(event.clientX, event.clientY);
      this.heading -= dx * SHIP.onFoot.lookRadiansPerPixel;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - dy * SHIP.onFoot.lookRadiansPerPixel,
        -Math.PI * 0.46,
        Math.PI * 0.46,
      );
      this.syncCamera();
    });
    const endDrag = (event) => {
      this.dragging = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
    };
    this.canvas.addEventListener("pointerup", endDrag);
    this.canvas.addEventListener("pointercancel", endDrag);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.keys.clear();
    this.virtualKeys.clear();
    if (this.enabled) this.syncCamera();
    this.emit();
  }

  reset() {
    this.localStationId = null;
    this.deckId = SHIP.onFoot.startDeck;
    this.position.set(...SHIP.onFoot.startPositionMetres);
    this.heading = SHIP.onFoot.startYawRadians;
    this.pitch = 0;
    this.ridingElevator = false;
    this.elevatorDestination = null;
    const outerDoor = this.ship.interior.doors.find((door) => door.id === SHIP.boarding.outerDoorId);
    outerDoor?.setOpen(false, true);
    this.lastAction = "Outside the starboard airlock · open the marked door to board";
    this.syncCamera();
    this.emit();
  }

  currentDeck() { return deckById(this.deckId); }

  setVirtualInput(code, active) {
    if (active) this.virtualKeys.add(code);
    else this.virtualKeys.delete(code);
    return [...this.virtualKeys];
  }

  inputActive(...codes) {
    return codes.some((code) => this.keys.has(code) || this.virtualKeys.has(code));
  }

  doorThresholdContains(position, door, padding = SHIP.onFoot.bodyRadiusMetres + 0.04) {
    const world = new THREE.Vector3();
    door.group.getWorldPosition(world);
    const halfWidth = SHIP.circulation.hatchWidthMetres / 2 + padding;
    return door.axis === "z"
      ? Math.abs(position.x - world.x) <= padding && Math.abs(position.z - world.z) <= halfWidth
      : Math.abs(position.z - world.z) <= padding && Math.abs(position.x - world.x) <= halfWidth;
  }

  closedDoorBlocks(candidate) {
    return this.ship.interior.doors.some((door) =>
      door.fraction < SHIP.boarding.collisionOpenFraction && this.doorThresholdContains(candidate, door));
  }

  isNavigable(candidate, deckId = this.deckId) {
    const radius = SHIP.onFoot.bodyRadiusMetres;
    const zones = this.ship.interior.navZones[deckId];
    const probes = [[candidate.x, candidate.z]];
    for (let index = 0; index < 16; index++) {
      const angle = index / 16 * Math.PI * 2;
      probes.push([candidate.x + Math.cos(angle) * radius, candidate.z + Math.sin(angle) * radius]);
    }
    const insideNav = probes.every(([x, z]) => zones.some((zone) =>
      x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax));
    return insideNav && !this.closedDoorBlocks(candidate);
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.ridingElevator) {
      const elevator = this.ship.interior.elevator;
      const [x, , z] = [SHIP.mechanisms.elevatorXMetres, 0, SHIP.mechanisms.verticalTransferZMetres];
      this.position.set(x, elevator.group.position.y, z);
      if (Math.abs(elevator.fraction - elevator.target) < 0.001) {
        this.deckId = this.elevatorDestination;
        this.position.y = this.currentDeck().floorYMetres;
        this.ridingElevator = false;
        this.lastAction = `Elevator arrived at ${this.deckId}`;
        this.emit();
      }
      this.syncCamera();
      return;
    }
    if (this.localStationId) {
      this.syncCamera();
      return;
    }

    let forwardInput = 0;
    let rightInput = 0;
    if (this.inputActive("KeyW", "ArrowUp")) forwardInput += 1;
    if (this.inputActive("KeyS", "ArrowDown")) forwardInput -= 1;
    if (this.inputActive("KeyD", "ArrowRight")) rightInput += 1;
    if (this.inputActive("KeyA", "ArrowLeft")) rightInput -= 1;
    const length = Math.hypot(forwardInput, rightInput);
    if (length > 0) {
      forwardInput /= length;
      rightInput /= length;
      const speed = this.inputActive("ShiftLeft", "ShiftRight")
        ? SHIP.onFoot.sprintSpeedMetresPerSecond
        : SHIP.onFoot.walkSpeedMetresPerSecond;
      const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
      const right = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
      const movement = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(rightInput)).multiplyScalar(speed * dt);
      const candidate = this.position.clone().add(movement);
      if (this.isNavigable(candidate)) this.position.copy(candidate);
      else {
        // Axis separation allows the player to slide along a wall instead of
        // sticking when approaching it diagonally.
        const candidateX = this.position.clone(); candidateX.x += movement.x;
        if (this.isNavigable(candidateX)) this.position.x = candidateX.x;
        const candidateZ = this.position.clone(); candidateZ.z += movement.z;
        if (this.isNavigable(candidateZ)) this.position.z = candidateZ.z;
      }
    }
    this.position.y = this.currentDeck().floorYMetres;
    this.syncCamera();
  }

  syncCamera() {
    this.camera.up.set(...CONFIG.world.up);
    if (this.localStationId) {
      const station = stationById(this.localStationId);
      this.camera.position.set(
        station.positionMetres[0],
        station.positionMetres[1] + 1.18,
        station.positionMetres[2] + 0.03,
      );
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.pitch, station.yawRadians + Math.PI + this.heading, 0);
    } else {
      this.camera.position.set(
        this.position.x,
        this.position.y + SHIP.onFoot.eyeHeightMetres,
        this.position.z,
      );
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.pitch, this.heading + Math.PI, 0);
    }
    this.camera.updateMatrixWorld(true);
  }

  nearestStation() {
    let best = null;
    for (const station of SHIP.stations.filter((item) => item.seat && item.deck === this.deckId)) {
      const d = xzDistance(this.position, { x: station.positionMetres[0], z: station.positionMetres[2] });
      if (d <= SHIP.onFoot.interactionDistanceMetres && (!best || d < best.distance)) best = { station, distance: d };
    }
    return best;
  }

  nearestDoor() {
    let best = null;
    for (const door of this.ship.interior.doors) {
      const world = new THREE.Vector3();
      door.group.getWorldPosition(world);
      const d = xzDistance(this.position, world);
      if (d <= SHIP.onFoot.interactionDistanceMetres && (!best || d < best.distance)) best = { door, distance: d };
    }
    return best;
  }

  locationLabel() {
    if (this.localStationId) return stationById(this.localStationId).name;
    const [xMin, xMax, zMin, zMax] = SHIP.boarding.platformBoundsMetres;
    if (this.deckId === "L1" && this.position.x >= xMin && this.position.x <= xMax &&
        this.position.z >= zMin && this.position.z <= zMax &&
        this.position.x > SHIP.boarding.outerDoorPositionMetres[0] + 0.08) {
      return "Exterior boarding platform";
    }
    const deck = this.currentDeck();
    const room = deck.rooms.find((item) =>
      this.position.x >= item.bounds[0] && this.position.x <= item.bounds[1] &&
      this.position.z >= item.bounds[2] && this.position.z <= item.bounds[3]);
    if (room) return room.name;
    const corridor = deck.corridor;
    if (this.position.x >= corridor.xMin && this.position.x <= corridor.xMax &&
        this.position.z >= corridor.zMin && this.position.z <= corridor.zMax) {
      return `${deck.name} corridor`;
    }
    return deck.name;
  }

  interactionTarget() {
    if (this.localStationId) {
      return { type: "seat", id: this.localStationId, action: "leave", label: "Leave seat" };
    }
    const station = this.nearestStation();
    if (station) return { type: "station", id: station.station.id, action: "sit", label: `Sit · ${station.station.name}` };
    if (this.nearTransfer("elevator")) return { type: "elevator", id: "ELEVATOR-01", action: "use", label: "Use elevator" };
    if (this.nearTransfer("ladder")) return { type: "ladder", id: "LADDER-01", action: "use", label: "Climb ladder" };
    const nearest = this.nearestDoor();
    if (nearest) {
      const door = nearest.door;
      const moving = Math.abs(door.fraction - door.target) > 0.001;
      const outer = door.id === SHIP.boarding.outerDoorId;
      const name = outer ? "airlock" : "door";
      if (moving) return { type: "door", id: door.id, action: "wait", label: `${door.target ? "Opening" : "Closing"} ${name}…`, disabled: true };
      return {
        type: "door",
        id: door.id,
        action: door.target ? "close" : "open",
        label: `${door.target ? "Close" : "Open"} ${name}`,
      };
    }
    return null;
  }

  nearTransfer(type) {
    const x = type === "ladder" ? SHIP.mechanisms.ladderXMetres : SHIP.mechanisms.elevatorXMetres;
    const z = SHIP.mechanisms.verticalTransferZMetres;
    return Math.hypot(this.position.x - x, this.position.z - z) <= SHIP.onFoot.interactionDistanceMetres;
  }

  interact() {
    if (this.localStationId) return this.leaveStation();
    const station = this.nearestStation();
    if (station) return this.occupyStation(station.station.id);
    if (this.nearTransfer("elevator")) return this.useElevator();
    if (this.nearTransfer("ladder")) return this.useLadder();
    const door = this.nearestDoor();
    if (door) {
      if (door.door.target > 0.5 && this.doorThresholdContains(this.position, door.door, SHIP.onFoot.bodyRadiusMetres + 0.10)) {
        this.lastAction = "Clear the door threshold before closing";
        this.emit();
        return door.door.report();
      }
      door.door.toggle();
      this.lastAction = `${door.door.id} ${door.door.target ? "opening" : "closing"}`;
      this.emit();
      return door.door.report();
    }
    this.lastAction = "Nothing in reach";
    this.emit();
    return null;
  }

  occupyStation(id) {
    const station = stationById(id);
    if (!station.seat) throw new Error(`${id} is not a seat`);
    if (this.remoteCrew.has(id)) throw new Error(`${id} is already occupied by ${this.remoteCrew.get(id)}`);
    this.localStationId = id;
    this.deckId = station.deck;
    this.position.set(...station.positionMetres);
    this.heading = 0;
    this.pitch = 0;
    this.lastAction = `Occupied ${station.name}`;
    this.syncCamera();
    this.emit();
    return this.report();
  }

  leaveStation() {
    if (!this.localStationId) return this.report();
    const station = stationById(this.localStationId);
    const forward = new THREE.Vector3(Math.sin(station.yawRadians), 0, Math.cos(station.yawRadians));
    this.position.set(...station.positionMetres).addScaledVector(forward, -0.82);
    this.position.y = deckById(station.deck).floorYMetres;
    this.localStationId = null;
    this.heading = station.yawRadians + Math.PI;
    this.pitch = 0;
    this.lastAction = `Left ${station.name}`;
    this.syncCamera();
    this.emit();
    return this.report();
  }

  useLadder() {
    const destination = this.deckId === "L1" ? "L2" : "L1";
    this.deckId = destination;
    this.position.set(
      SHIP.mechanisms.ladderXMetres,
      deckById(destination).floorYMetres,
      SHIP.mechanisms.verticalTransferZMetres,
    );
    this.lastAction = `Climbed ladder to ${destination}`;
    this.syncCamera();
    this.emit();
    return this.report();
  }

  useElevator() {
    const elevator = this.ship.interior.elevator;
    const currentFraction = this.deckId === "L2" ? 1 : 0;
    if (Math.abs(elevator.fraction - currentFraction) > 0.08) {
      elevator.setDeck(this.deckId);
      this.lastAction = `Called elevator to ${this.deckId}`;
      this.emit();
      return this.report();
    }
    this.elevatorDestination = this.deckId === "L1" ? "L2" : "L1";
    elevator.setDeck(this.elevatorDestination);
    this.ridingElevator = true;
    this.lastAction = `Riding elevator to ${this.elevatorDestination}`;
    this.emit();
    return this.report();
  }

  setRemoteCrew(stationId, occupied, crewId = "teammate") {
    stationById(stationId);
    if (stationId === this.localStationId && occupied) throw new Error(`${stationId} is occupied by the local player`);
    if (occupied) this.remoteCrew.set(stationId, crewId);
    else this.remoteCrew.delete(stationId);
    this.lastAction = occupied ? `${crewId} occupied ${stationId}` : `${stationId} is now empty`;
    this.emit();
    return this.weaponState();
  }

  occupantAt(stationId) {
    if (this.localStationId === stationId) return "local-player";
    return this.remoteCrew.get(stationId) || null;
  }

  weaponState() {
    return SHIP.weapons.map((weapon) => {
      const operator = this.occupantAt(weapon.controlStation);
      return {
        id: weapon.id,
        name: weapon.name,
        controlStation: weapon.controlStation,
        requiresDedicatedOperator: weapon.requiresDedicatedOperator,
        available: Boolean(operator),
        operator,
        reason: operator
          ? `${weapon.name} controlled by ${operator}`
          : weapon.requiresDedicatedOperator
            ? `Unavailable: someone must physically occupy ${weapon.controlStation}`
            : `Unavailable: the pilot seat is empty`,
      };
    });
  }

  report() {
    return {
      enabled: this.enabled,
      mode: this.localStationId ? "seated" : this.ridingElevator ? "elevator" : "walking",
      deck: this.deckId,
      location: this.locationLabel(),
      positionMetres: [round(this.position.x), round(this.position.y), round(this.position.z)],
      headingRadians: round(this.heading),
      localStationId: this.localStationId,
      remoteCrew: [...this.remoteCrew.entries()].map(([stationId, crewId]) => ({ stationId, crewId })),
      lastAction: this.lastAction,
      interaction: this.interactionTarget(),
      weapons: this.weaponState(),
    };
  }

  emit() { this.onStateChange(this.report()); }
}
