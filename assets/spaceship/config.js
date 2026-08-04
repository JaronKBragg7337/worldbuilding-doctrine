// Spaceship testbed configuration.
//
// Every control, camera, world, and harness constant lives here. Distances are
// metres, speeds are metres/second, accelerations are metres/second^2, angles
// are radians unless the key explicitly says `Degrees`, and times are seconds.

// Root-space contract inherited from the doctrine: forward +Z, up +Y, right +X.
export const CONFIG = Object.freeze({
  world: Object.freeze({
    up: Object.freeze([0, 1, 0]),
    sizeMetres: 160,
    gridModuleMetres: 4,
    groundYMetres: 0,
  }),

  render: Object.freeze({
    clearColor: 0x0b1116,
    fogColor: 0x0b1116,
    fogNearMetres: 72,
    fogFarMetres: 145,
    maxDevicePixelRatio: 2,
    toneMappingExposure: 1.0,
  }),

  simulation: Object.freeze({
    fixedDtSeconds: 1 / 60,
    defaultScenarioSeconds: 10,
    tracePrecisionDecimals: 5,
  }),

  // This wireframe object is a harness calibration probe, not a ship design.
  // It exists so control traces and camera containment can be proven before the
  // primary hull form is chosen.
  calibrationProbe: Object.freeze({
    widthMetres: 3.2,
    heightMetres: 1.2,
    lengthMetres: 7.2,
    hoverHeightMetres: 1.4,
  }),

  // Selected hero ship. B remains in `silhouettes` as the decision-time primary
  // form; this B2 specification is the buildable architecture derived from it.
  ship: Object.freeze({
    id: "SHIP-B2-0001",
    name: "Split-keel Courier B2",
    selectedSilhouette: "B",
    coordinateSystem: Object.freeze({ forward: "+Z", up: "+Y", right: "+X" }),
    dimensionsMetres: Object.freeze({ width: 22.4, height: 7.6, length: 31.0 }),
    boundsMetres: Object.freeze({
      min: Object.freeze([-11.2, -0.45, -15.2]),
      max: Object.freeze([11.2, 7.15, 15.8]),
    }),
    humanReferenceHeightMetres: 1.8,
    shellThicknessMetres: 0.12,
    exposedEdgeBevelMetres: 0.012,
    circulation: Object.freeze({
      hatchWidthMetres: 0.9,
      hatchHeightMetres: 2.0,
      corridorWidthMetres: 1.15,
      doorFrameDepthMetres: 0.16,
      thresholdHeightMetres: 0.035,
      handrailHeightMetres: 0.9,
      ladderWidthMetres: 0.42,
      ladderRungSpacingMetres: 0.3,
      deckFloorToFloorMetres: 2.55,
      elevatorCabinMetres: Object.freeze([1.15, 2.05, 1.35]),
    }),
    exteriorComponents: Object.freeze([
      Object.freeze({ type: "loft", name: "port-pressure-boom", material: "hull", offsetX: -7.2, radialSegments: 12, stations: Object.freeze([
        Object.freeze({ z: -14.2, width: 5.6, height: 4.9, y: 2.65 }),
        Object.freeze({ z: -7.0, width: 6.0, height: 5.15, y: 2.70 }),
        Object.freeze({ z: 4.0, width: 5.2, height: 4.7, y: 2.85 }),
        Object.freeze({ z: 12.8, width: 1.4, height: 1.8, y: 3.0 }),
      ]) }),
      Object.freeze({ type: "loft", name: "starboard-pressure-boom", material: "hull", offsetX: 7.35, radialSegments: 12, stations: Object.freeze([
        Object.freeze({ z: -14.2, width: 5.6, height: 4.85, y: 2.62 }),
        Object.freeze({ z: -6.5, width: 5.9, height: 5.2, y: 2.70 }),
        Object.freeze({ z: 3.6, width: 5.25, height: 4.75, y: 2.85 }),
        Object.freeze({ z: 11.8, width: 1.55, height: 1.9, y: 3.0 }),
      ]) }),
      Object.freeze({ type: "loft", name: "centreline-pressure-spine", material: "hullDark", radialSegments: 12, stations: Object.freeze([
        Object.freeze({ z: -12.0, width: 4.8, height: 4.4, y: 2.8 }),
        Object.freeze({ z: -1.0, width: 4.6, height: 5.0, y: 3.2 }),
        Object.freeze({ z: 8.0, width: 4.4, height: 4.7, y: 3.45 }),
        Object.freeze({ z: 13.5, width: 2.4, height: 2.5, y: 3.55 }),
        Object.freeze({ z: 15.8, width: 0.7, height: 0.8, y: 3.5 }),
      ]) }),
      Object.freeze({ type: "prism", name: "aft-drive-bridge", material: "hullDark", yMin: 0.55, yMax: 4.75, points: Object.freeze([
        Object.freeze([-10.4, -15.2]), Object.freeze([10.55, -15.2]),
        Object.freeze([9.1, -8.9]), Object.freeze([-9.0, -9.1]),
      ]) }),
      Object.freeze({ type: "prism", name: "forward-systems-yoke", material: "hullDark", yMin: 1.4, yMax: 4.6, points: Object.freeze([
        Object.freeze([-9.0, 1.6]), Object.freeze([-7.1, 6.0]), Object.freeze([-2.0, 7.8]),
        Object.freeze([2.0, 7.8]), Object.freeze([7.2, 5.8]), Object.freeze([9.1, 1.4]),
      ]) }),
      Object.freeze({ type: "loft", name: "dorsal-command-deck", material: "hull", radialSegments: 12, stations: Object.freeze([
        Object.freeze({ z: -4.0, width: 4.2, height: 2.1, y: 5.4 }),
        Object.freeze({ z: 5.5, width: 4.0, height: 2.4, y: 5.65 }),
        Object.freeze({ z: 10.0, width: 2.2, height: 1.4, y: 5.5 }),
      ]) }),
      Object.freeze({ type: "loft", name: "ventral-keel", material: "hullDark", radialSegments: 10, stations: Object.freeze([
        Object.freeze({ z: -11.0, width: 4.2, height: 1.9, y: 0.5 }),
        Object.freeze({ z: -3.0, width: 4.5, height: 1.7, y: 0.4 }),
        Object.freeze({ z: 5.0, width: 2.0, height: 1.1, y: 0.8 }),
      ]) }),
      Object.freeze({ type: "loft", name: "starboard-airlock-blister", material: "accent", offsetX: 10.0, radialSegments: 10, stations: Object.freeze([
        Object.freeze({ z: -5.5, width: 2.4, height: 2.6, y: 2.55 }),
        Object.freeze({ z: -3.0, width: 2.4, height: 2.8, y: 2.55 }),
        Object.freeze({ z: -0.8, width: 1.1, height: 1.3, y: 2.65 }),
      ]) }),
    ]),
    engines: Object.freeze([
      Object.freeze({ id: "ENG-MAIN", positionMetres: Object.freeze([0, 0.55, -15.05]), radiusMetres: 2.15, lengthMetres: 3.0 }),
      Object.freeze({ id: "ENG-PORT", positionMetres: Object.freeze([-7.2, 2.0, -15.05]), radiusMetres: 1.55, lengthMetres: 2.45 }),
      Object.freeze({ id: "ENG-STBD", positionMetres: Object.freeze([7.35, 2.0, -15.05]), radiusMetres: 1.55, lengthMetres: 2.45 }),
    ]),
    landingGear: Object.freeze([
      Object.freeze({ id: "GEAR-PF", positionMetres: Object.freeze([-7.2, 0.25, 6.0]), rakeXMetres: -0.65 }),
      Object.freeze({ id: "GEAR-SF", positionMetres: Object.freeze([7.35, 0.25, 5.7]), rakeXMetres: 0.65 }),
      Object.freeze({ id: "GEAR-PA", positionMetres: Object.freeze([-7.2, 0.25, -8.0]), rakeXMetres: -0.72 }),
      Object.freeze({ id: "GEAR-SA", positionMetres: Object.freeze([7.35, 0.25, -7.8]), rakeXMetres: 0.72 }),
    ]),
    mechanisms: Object.freeze({
      airlockDoorSeconds: 1.1,
      interiorDoorSeconds: 0.7,
      elevatorTravelSeconds: 2.4,
      elevatorXMetres: 1.35,
      ladderXMetres: -1.35,
      verticalTransferZMetres: -1.65,
    }),
    boarding: Object.freeze({
      outerDoorId: "DOOR-AIRLOCK-OUTER",
      outerDoorPositionMetres: Object.freeze([11.20, 1.05, -3.05]),
      apertureCenterMetres: Object.freeze([11.24, 2.05, -3.05]),
      apertureWidthMetres: 1.02,
      apertureHeightMetres: 2.08,
      platformBoundsMetres: Object.freeze([10.38, 12.55, -3.85, -2.25]),
      collisionOpenFraction: 0.82,
    }),
    onFoot: Object.freeze({
      eyeHeightMetres: 1.68,
      bodyRadiusMetres: 0.30,
      walkSpeedMetresPerSecond: 2.8,
      sprintSpeedMetresPerSecond: 4.5,
      lookRadiansPerPixel: 0.0022,
      interactionDistanceMetres: 1.45,
      startDeck: "L1",
      startPositionMetres: Object.freeze([12.05, 1.05, -3.05]),
      startYawRadians: -1.5707963268,
    }),
    fixedViews: Object.freeze({
      exteriorCameraMetres: Object.freeze([29, 17, -31]),
      exteriorTargetMetres: Object.freeze([0, 2.8, 0]),
      engineCameraMetres: Object.freeze([18, 4.2, -28]),
      engineTargetMetres: Object.freeze([0, 1.2, -10.8]),
      cutawayCameraMetres: Object.freeze([23, 17, 20]),
      cutawayTargetMetres: Object.freeze([0, 3.0, -0.5]),
      cockpitCameraMetres: Object.freeze([0, 4.90, 8.65]),
      cockpitTargetMetres: Object.freeze([0, 4.7, 15.2]),
      corridorCameraMetres: Object.freeze([0, 4.92, 5.2]),
      corridorTargetMetres: Object.freeze([0, 4.75, -7.2]),
      lowerDeckCameraMetres: Object.freeze([0, 2.30, 4.7]),
      lowerDeckTargetMetres: Object.freeze([0, 2.25, -9.0]),
      dorsalGunnerCameraMetres: Object.freeze([7.15, 4.90, 0.75]),
      dorsalGunnerTargetMetres: Object.freeze([5.75, 4.08, 0.75]),
      ventralGunnerCameraMetres: Object.freeze([0, 2.35, -6.35]),
      ventralGunnerTargetMetres: Object.freeze([0, 1.66, -7.65]),
    }),
    decks: Object.freeze([
      Object.freeze({
        id: "L1",
        name: "Lower operations deck",
        floorYMetres: 1.05,
        ceilingYMetres: 3.25,
        corridor: Object.freeze({ xMin: -0.575, xMax: 0.575, zMin: -8.2, zMax: 5.8 }),
        rooms: Object.freeze([
          Object.freeze({ id: "ROOM-L1-CARGO", name: "Port cargo bay", floor: "tread", bounds: Object.freeze([-9.2, -2.3, -7.8, 1.1]), entrance: Object.freeze({ wall: "east", centerMetres: -3.1 }) }),
          Object.freeze({ id: "ROOM-L1-CREW", name: "Starboard crew galley", floor: "rubber", bounds: Object.freeze([2.3, 9.0, -1.8, 5.3]), entrance: Object.freeze({ wall: "west", centerMetres: 1.7 }) }),
          Object.freeze({ id: "ROOM-L1-ENGINE", name: "Aft engineering", floor: "tread", bounds: Object.freeze([-4.2, 4.2, -13.7, -8.1]), entrance: Object.freeze({ wall: "north", centerMetres: 0 }) }),
          Object.freeze({ id: "ROOM-L1-VENTRAL", name: "Ventral gunnery", floor: "rubber", bounds: Object.freeze([-2.1, 2.1, -7.9, -4.8]), entrance: Object.freeze({ wall: "north", centerMetres: 0 }) }),
          Object.freeze({ id: "ROOM-L1-AIRLOCK", name: "Starboard airlock", floor: "tread", bounds: Object.freeze([8.6, 10.7, -4.4, -1.7]), entrance: Object.freeze({ wall: "west", centerMetres: -3.05 }) }),
        ]),
      }),
      Object.freeze({
        id: "L2",
        name: "Flight deck",
        floorYMetres: 3.60,
        ceilingYMetres: 5.82,
        corridor: Object.freeze({ xMin: -0.60, xMax: 0.60, zMin: -7.4, zMax: 6.6 }),
        rooms: Object.freeze([
          Object.freeze({ id: "ROOM-L2-COCKPIT", name: "Cockpit", floor: "rubber", bounds: Object.freeze([-2.3, 2.3, 6.2, 13.7]), entrance: Object.freeze({ wall: "south", centerMetres: 0 }) }),
          Object.freeze({ id: "ROOM-L2-PORT", name: "Port crew cabin", floor: "rubber", bounds: Object.freeze([-9.0, -3.0, -3.8, 2.5]), entrance: Object.freeze({ wall: "east", centerMetres: 0 }) }),
          Object.freeze({ id: "ROOM-L2-DORSAL", name: "Dorsal gunnery", floor: "rubber", bounds: Object.freeze([3.1, 9.1, -1.5, 3.2]), entrance: Object.freeze({ wall: "west", centerMetres: 0.75 }) }),
          Object.freeze({ id: "ROOM-L2-CROSS", name: "Systems cross-bridge", floor: "tread", bounds: Object.freeze([-9.0, 9.0, -1.0, 1.0]), entrance: Object.freeze({ wall: "none", centerMetres: 0 }) }),
        ]),
      }),
    ]),
    stations: Object.freeze([
      Object.freeze({ id: "STN-PILOT", name: "Pilot / assisted gun", deck: "L2", positionMetres: Object.freeze([0, 3.72, 8.65]), yawRadians: 0, seat: true }),
      Object.freeze({ id: "STN-NAV", name: "Navigation / systems", deck: "L2", positionMetres: Object.freeze([-1.25, 3.72, 7.75]), yawRadians: 0, seat: true }),
      Object.freeze({ id: "STN-DORSAL", name: "Dorsal turret chair", deck: "L2", positionMetres: Object.freeze([7.15, 3.72, 0.75]), yawRadians: -1.5707963268, seat: true }),
      Object.freeze({ id: "STN-VENTRAL", name: "Ventral turret chair", deck: "L1", positionMetres: Object.freeze([0, 1.17, -6.35]), yawRadians: 3.1415926536, seat: true }),
      Object.freeze({ id: "STN-AIRLOCK", name: "Starboard boarding platform", deck: "L1", positionMetres: Object.freeze([12.05, 1.05, -3.05]), yawRadians: -1.5707963268, seat: false }),
    ]),
    weapons: Object.freeze([
      Object.freeze({
        id: "WPN-CHIN-01",
        name: "Forward assisted repeater",
        mount: "chin",
        controlStation: "STN-PILOT",
        requiresDedicatedOperator: false,
        rule: "Available while the pilot remains seated; narrow forward assist arc.",
      }),
      Object.freeze({
        id: "WPN-DORSAL-01",
        name: "Dorsal traverse cannon",
        mount: "dorsal",
        controlStation: "STN-DORSAL",
        requiresDedicatedOperator: true,
        rule: "Requires a crew member physically occupying the dorsal turret chair.",
      }),
      Object.freeze({
        id: "WPN-VENTRAL-01",
        name: "Ventral defence turret",
        mount: "ventral",
        controlStation: "STN-VENTRAL",
        requiresDedicatedOperator: true,
        rule: "Requires a crew member physically occupying the lower-deck turret chair.",
      }),
    ]),
    crewRoutes: Object.freeze([
      Object.freeze({
        id: "ROUTE-AIRLOCK-PILOT",
        name: "Board through the starboard airlock and take the flight seat",
        fromStation: "STN-AIRLOCK",
        toStation: "STN-PILOT",
        pointsMetres: Object.freeze([
          Object.freeze([12.05, 1.05, -3.05]), Object.freeze([11.56, 1.05, -3.05]),
          Object.freeze([10.35, 1.17, -3.05]), Object.freeze([9.65, 1.17, -3.05]),
          Object.freeze([7.6, 1.17, -3.05]),
          Object.freeze([0, 1.17, -3.05]), Object.freeze([0, 1.17, -1.65]),
          Object.freeze([1.35, 1.17, -1.65]), Object.freeze([1.35, 3.72, -1.65]),
          Object.freeze([0, 3.72, -1.65]), Object.freeze([0, 3.72, 8.65]),
        ]),
      }),
      Object.freeze({
        id: "ROUTE-PILOT-DORSAL",
        name: "Leave pilot seat for dorsal gun",
        fromStation: "STN-PILOT",
        toStation: "STN-DORSAL",
        pointsMetres: Object.freeze([
          Object.freeze([0, 3.72, 8.65]), Object.freeze([0, 3.72, 0.75]),
          Object.freeze([7.15, 3.72, 0.75]),
        ]),
      }),
      Object.freeze({
        id: "ROUTE-PILOT-VENTRAL",
        name: "Leave pilot seat for ventral gun",
        fromStation: "STN-PILOT",
        toStation: "STN-VENTRAL",
        pointsMetres: Object.freeze([
          Object.freeze([0, 3.72, 8.65]), Object.freeze([0, 3.72, -1.65]),
          Object.freeze([-1.35, 3.72, -1.65]), Object.freeze([-1.35, 1.17, -1.65]),
          Object.freeze([0, 1.17, -1.65]), Object.freeze([0, 1.17, -6.35]),
        ]),
      }),
    ]),
  }),

  controls: Object.freeze({
    hover: Object.freeze({
      maxForwardSpeedMetresPerSecond: 28,
      driveAccelerationMetresPerSecond2: 8.5,
      brakingMetresPerSecond2: 14,
      coastDecelerationMetresPerSecond2: 3.2,
      maxYawRateRadiansPerSecond: 1.05,
      lowSpeedSteeringFraction: 0.18,
      fullSteeringSpeedMetresPerSecond: 9,
    }),
    flight: Object.freeze({
      maxForwardSpeedMetresPerSecond: 72,
      thrustAccelerationMetresPerSecond2: 13,
      brakingMetresPerSecond2: 18,
      dragPerSecond: 0.08,
      maxYawRateRadiansPerSecond: 0.82,
      maxPitchRateRadiansPerSecond: 0.48,
      climbAccelerationMetresPerSecond2: 8,
    }),
  }),

  followCamera: Object.freeze({
    fovDegrees: 58,
    nearMetres: 0.08,
    farMetres: 320,
    followDistanceMetres: 31,
    heightMetres: 12,
    focusHeightMetres: 2.8,
    positionDampingLambda: 9,
    focusDampingLambda: 9,
    positionFeedForwardSeconds: 0.18,
    focusFeedForwardSeconds: 0.18,
    maxFeedForwardMetres: 8.5,
    screenClampNdc: 0.32,
  }),

  harness: Object.freeze({
    turntableAnglesDegrees: Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]),
    filmstripTimesSeconds: Object.freeze([0, 2, 4, 6, 8, 10]),
    groundCourseWidthMetres: 18,
    airGateWidthMetres: 30,
    airGateHeightMetres: 14,
    wideCameraPositionMetres: Object.freeze([58, 42, -62]),
    wideCameraTargetMetres: Object.freeze([0, 8, 0]),
  }),

  // Both routes are data. Geometry is derived from these coordinates.
  groundCourse: Object.freeze([
    Object.freeze({ id: "GROUND-00", positionMetres: Object.freeze([-30, 0.04, -28]) }),
    Object.freeze({ id: "GROUND-01", positionMetres: Object.freeze([-8, 0.04, -28]) }),
    Object.freeze({ id: "GROUND-02", positionMetres: Object.freeze([14, 0.04, -18]) }),
    Object.freeze({ id: "GROUND-03", positionMetres: Object.freeze([24, 0.04, 2]) }),
    Object.freeze({ id: "GROUND-04", positionMetres: Object.freeze([12, 0.04, 24]) }),
    Object.freeze({ id: "GROUND-05", positionMetres: Object.freeze([-14, 0.04, 28]) }),
    Object.freeze({ id: "GROUND-06", positionMetres: Object.freeze([-30, 0.04, 10]) }),
    Object.freeze({ id: "GROUND-07", positionMetres: Object.freeze([-30, 0.04, -28]) }),
  ]),

  airRoute: Object.freeze([
    Object.freeze({ id: "AIR-00", positionMetres: Object.freeze([-24, 10, -20]), yawRadians: 0.15 }),
    Object.freeze({ id: "AIR-01", positionMetres: Object.freeze([-5, 14, -6]), yawRadians: 0.55 }),
    Object.freeze({ id: "AIR-02", positionMetres: Object.freeze([18, 18, 4]), yawRadians: 1.15 }),
    Object.freeze({ id: "AIR-03", positionMetres: Object.freeze([5, 23, 27]), yawRadians: 2.25 }),
    Object.freeze({ id: "AIR-04", positionMetres: Object.freeze([-22, 17, 18]), yawRadians: 3.45 }),
  ]),

  // Primary form only. Components are broad hull masses with no seams,
  // fasteners, openings, landing gear, thrusters, or surface wear.
  silhouettes: Object.freeze({
    A: Object.freeze({
      id: "A",
      name: "Manta Relay",
      concept: "Low swept lifting body; starboard service blister; deep ventral keel.",
      components: Object.freeze([
        { type: "loft", name: "lower-planform", tone: "low", stations: [
          { z: -14, width: 14, height: 0.8, y: 1.15 },
          { z: -9, width: 23.5, height: 1.0, y: 1.25 },
          { z: -2, width: 21.5, height: 1.2, y: 1.45 },
          { z: 7, width: 12.5, height: 1.0, y: 1.55 },
          { z: 14.8, width: 1.1, height: 0.4, y: 1.55 },
        ] },
        { type: "loft", name: "pressure-core", tone: "primary", stations: [
          { z: -12.5, width: 14.5, height: 3.8, y: 2.65 },
          { z: -6, width: 17.5, height: 4.2, y: 2.75 },
          { z: 2, width: 13.4, height: 4.6, y: 2.85 },
          { z: 9.5, width: 6.5, height: 3.4, y: 2.9 },
          { z: 14.3, width: 1.2, height: 1.0, y: 2.45 },
        ] },
        { type: "loft", name: "dorsal-deck", tone: "high", stations: [
          { z: -5, width: 7.0, height: 2.0, y: 5.0 },
          { z: 4, width: 6.0, height: 2.2, y: 5.15 },
          { z: 10.5, width: 2.0, height: 1.2, y: 4.7 },
        ] },
        { type: "loft", name: "starboard-service-blister", tone: "accent", offsetX: 8.8, stations: [
          { z: -8, width: 3.4, height: 2.6, y: 2.9 },
          { z: -2, width: 4.0, height: 2.8, y: 3.0 },
          { z: 5, width: 2.0, height: 1.8, y: 3.0 },
        ] },
        { type: "loft", name: "ventral-keel", tone: "low", stations: [
          { z: -10, width: 3.0, height: 2.2, y: 0.15 },
          { z: 0, width: 3.6, height: 2.5, y: 0.05 },
          { z: 7, width: 1.2, height: 1.5, y: 0.35 },
        ] },
      ]),
    }),
    B: Object.freeze({
      id: "B",
      name: "Split-keel Courier",
      concept: "Twin pressure booms around a recessed centreline spine and open service channels.",
      components: Object.freeze([
        { type: "loft", name: "port-boom", tone: "primary", offsetX: -7.2, stations: [
          { z: -14.2, width: 5.2, height: 3.8, y: 2.55 },
          { z: -7, width: 5.8, height: 4.2, y: 2.7 },
          { z: 4, width: 4.8, height: 3.7, y: 2.75 },
          { z: 12.8, width: 1.4, height: 1.5, y: 2.7 },
        ] },
        { type: "loft", name: "starboard-boom", tone: "primary", offsetX: 7.5, stations: [
          { z: -13.5, width: 5.4, height: 4.0, y: 2.5 },
          { z: -6, width: 5.8, height: 4.3, y: 2.65 },
          { z: 3, width: 5.0, height: 3.8, y: 2.7 },
          { z: 11.2, width: 1.6, height: 1.6, y: 2.65 },
        ] },
        { type: "loft", name: "centreline-spine", tone: "high", stations: [
          { z: -11, width: 4.6, height: 3.0, y: 3.0 },
          { z: -1, width: 4.4, height: 3.4, y: 3.25 },
          { z: 8, width: 3.2, height: 3.0, y: 3.2 },
          { z: 15, width: 0.8, height: 0.9, y: 2.8 },
        ] },
        { type: "prism", name: "aft-bridge", tone: "low", yMin: 1.05, yMax: 2.55, points: [
          [-10.2, -14.5], [10.5, -14.0], [9.0, -9.0], [-9.0, -9.5],
        ] },
        { type: "prism", name: "forward-yoke", tone: "low", yMin: 2.0, yMax: 3.25, points: [
          [-9.0, 2.0], [-7.0, 6.5], [-2.0, 8.0], [2.0, 8.0], [7.0, 6.0], [9.0, 1.8],
        ] },
        { type: "loft", name: "dorsal-command-deck", tone: "high", stations: [
          { z: -4, width: 4.0, height: 1.9, y: 5.25 },
          { z: 4, width: 3.7, height: 2.2, y: 5.45 },
          { z: 9, width: 1.8, height: 1.2, y: 5.0 },
        ] },
        { type: "loft", name: "starboard-docking-blister", tone: "accent", offsetX: 10.1, stations: [
          { z: -7, width: 2.2, height: 2.2, y: 3.1 },
          { z: -2, width: 2.6, height: 2.5, y: 3.15 },
          { z: 2, width: 1.2, height: 1.2, y: 3.1 },
        ] },
      ]),
    }),
    C: Object.freeze({
      id: "C",
      name: "Hammerhead Lander",
      concept: "Broad forward systems beam, narrow waist, and a heavy aft drive shelf.",
      components: Object.freeze([
        { type: "loft", name: "central-body", tone: "primary", stations: [
          { z: -14.5, width: 16.0, height: 4.6, y: 2.5 },
          { z: -9, width: 19.0, height: 5.0, y: 2.6 },
          { z: -3, width: 10.0, height: 4.5, y: 2.75 },
          { z: 6.5, width: 7.0, height: 3.7, y: 2.85 },
          { z: 10, width: 5.0, height: 3.0, y: 2.9 },
        ] },
        { type: "prism", name: "forward-systems-beam", tone: "primary", yMin: 1.8, yMax: 5.0, points: [
          [-12.5, 12.0], [-10.0, 8.0], [-4.0, 7.0], [4.0, 7.0],
          [10.0, 8.0], [12.5, 12.0], [8.0, 15.5], [-8.0, 15.5],
        ] },
        { type: "loft", name: "forward-command-deck", tone: "high", stations: [
          { z: 1, width: 4.6, height: 2.0, y: 5.0 },
          { z: 11, width: 5.5, height: 2.4, y: 5.2 },
          { z: 14.2, width: 3.0, height: 1.2, y: 5.0 },
        ] },
        { type: "prism", name: "aft-drive-shelf", tone: "low", yMin: 0.8, yMax: 2.8, points: [
          [-11.0, -15.0], [11.0, -15.0], [9.0, -9.5], [-9.0, -9.5],
        ] },
        { type: "loft", name: "ventral-keel", tone: "low", stations: [
          { z: -12, width: 3.5, height: 2.5, y: 0.0 },
          { z: -2, width: 4.0, height: 2.8, y: -0.05 },
          { z: 7, width: 1.4, height: 1.5, y: 0.2 },
        ] },
        { type: "loft", name: "port-mission-pod", tone: "accent", offsetX: -6.0, stations: [
          { z: -5, width: 3.0, height: 2.6, y: 3.2 },
          { z: 0, width: 3.4, height: 2.8, y: 3.25 },
          { z: 5, width: 1.4, height: 1.3, y: 3.2 },
        ] },
      ]),
    }),
  }),

  scenarios: Object.freeze({
    "full-forward": Object.freeze([
      Object.freeze({ untilSeconds: 10, mode: "hover", throttle: 1, steer: 0, pitch: 0, climb: 0, brake: 0 }),
    ]),
    "accelerating-turn": Object.freeze([
      Object.freeze({ untilSeconds: 10, mode: "hover", throttle: 1, steer: 1, pitch: 0, climb: 0, brake: 0 }),
    ]),
    "full-stop": Object.freeze([
      Object.freeze({ untilSeconds: 5, mode: "hover", throttle: 1, steer: 0, pitch: 0, climb: 0, brake: 0 }),
      Object.freeze({ untilSeconds: 10, mode: "hover", throttle: 0, steer: 0, pitch: 0, climb: 0, brake: 1 }),
    ]),
    "hover-to-flight": Object.freeze([
      Object.freeze({ untilSeconds: 3, mode: "hover", throttle: 0.85, steer: 0.15, pitch: 0, climb: 0, brake: 0 }),
      Object.freeze({ untilSeconds: 10, mode: "flight", throttle: 1, steer: 0.28, pitch: 0.18, climb: 0.35, brake: 0 }),
    ]),
  }),
});
