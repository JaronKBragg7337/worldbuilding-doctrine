// Vehicle-specific extension to the frozen visual harness.
//
// The shared lib/v1 harness proves desktop/mobile rendering. This runner adds
// the spaceship brief's deterministic camera-containment scenarios, JSON
// control traces, and motion filmstrips without changing lib/v1.
const { chromium } = require("playwright");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_OUT = path.join(__dirname, "out");
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const SCENARIOS = ["full-forward", "accelerating-turn", "full-stop", "hover-to-flight"];
const SHIP_VIEWS = ["exterior", "engines", "cutaway", "cockpit", "corridor", "lower", "dorsal", "ventral", "walk"];

function parseArgs() {
  return Object.fromEntries(process.argv.slice(2).map((arg) => {
    const index = arg.indexOf("=");
    return index < 0
      ? [arg.replace(/^--/, ""), true]
      : [arg.slice(2, index), arg.slice(index + 1)];
  }));
}

function pageUrl(base, params = {}) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}

function summary(result) {
  const { trace, ...rest } = result;
  return rest;
}

async function waitForLab(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  // The structured dev handle is the authoritative readiness signal. A console
  // listener occasionally missed the line in a fresh SwiftShader context even
  // though LAB was present and interactive, producing a false timeout.
  await page.waitForFunction(() => window.LAB?.simulation, null, { timeout: 120000 });
}

async function measureViewport(browser, baseUrl, view, outDir) {
  const viewport = VIEWPORTS[view];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`[console] ${message.text()}`);
  });
  await waitForLab(page, pageUrl(baseUrl, { dev: 1, view: "rig" }));

  const results = [];
  for (const scenario of SCENARIOS) {
    const result = await page.evaluate((name) => window.LAB.runScenario(name), scenario);
    results.push(summary(result));
    const tracePath = path.join(outDir, "traces", `${view}-${scenario}.json`);
    fs.mkdirSync(path.dirname(tracePath), { recursive: true });
    fs.writeFileSync(tracePath, JSON.stringify({
      schema: "worldbuilding-lab/control-trace/v1",
      viewport: view,
      coordinateSystem: { forward: "+Z", up: "+Y", right: "+X" },
      ...result,
    }, null, 2));
  }

  const screenshots = [];
  const shipViews = {};
  for (const mode of SHIP_VIEWS) {
    await page.evaluate((nextMode) => window.LAB.setView(nextMode), mode);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    shipViews[mode] = await page.evaluate((nextMode) => window.LAB.measureShipView(nextMode), mode);
    const shot = path.join(outDir, "views", `${view}-${mode}.png`);
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, animations: "disabled" });
    screenshots.push({ mode, path: shot });
  }
  const stats = await page.evaluate(() => ({
    renderer: window.LAB.stats(),
    scene: window.LAB.sceneReport(),
    materialCards: window.LAB.surfaceReport().cards,
    shipMaterialCards: window.LAB.spaceshipMaterialReport(),
    ship: window.LAB.shipReport(),
    crewScenario: window.LAB.runCrewScenario(),
    mechanismScenario: window.LAB.runMechanismScenario(),
    silhouettes: window.LAB.measureAllSilhouettes(),
  }));
  await context.close();
  return { view, viewport, results, shipViews, screenshots, stats, errors };
}

async function buildFilmstrips(browser, baseUrl, outDir) {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await waitForLab(page, pageUrl(baseUrl, { dev: 1, view: "rig" }));
  await page.evaluate(() => { document.body.dataset.capture = "filmstrip"; });
  const times = await page.evaluate(() => [...window.LAB.CONFIG.harness.filmstripTimesSeconds]);
  const filmstrips = [];

  for (const scenario of SCENARIOS) {
    const frames = [];
    for (const time of times) {
      await page.evaluate(({ name, t }) => {
        window.LAB.runScenarioToTime(name, t);
        document.querySelector("#frame-label").textContent = `${name} · ${t.toFixed(1)} s`;
      }, { name: scenario, t: time });
      const frame = path.join(outDir, "frames", scenario, `${String(time).padStart(4, "0")}.png`);
      fs.mkdirSync(path.dirname(frame), { recursive: true });
      await page.screenshot({ path: frame, animations: "disabled" });
      frames.push(frame);
    }

    const strip = path.join(outDir, "filmstrips", `${scenario}.png`);
    fs.mkdirSync(path.dirname(strip), { recursive: true });
    const montage = spawnSync("magick", [
      "montage",
      ...frames,
      "-tile", "3x2",
      "-geometry", "+4+4",
      "-background", "#0b1116",
      strip,
    ], { encoding: "utf8" });
    filmstrips.push({
      scenario,
      timesSeconds: times,
      path: montage.status === 0 ? strip : null,
      frames,
      montageError: montage.status === 0 ? null : (montage.stderr || montage.error?.message || "magick failed"),
    });
  }

  await context.close();
  return filmstrips;
}

async function main() {
  const args = parseArgs();
  const baseUrl = args.url || "http://localhost:8101/assets/spaceship/index.html";
  const outDir = path.resolve(args.out || DEFAULT_OUT);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
    ],
  });
  const viewportReports = [];
  for (const view of Object.keys(VIEWPORTS)) {
    viewportReports.push(await measureViewport(browser, baseUrl, view, outDir));
  }
  const filmstrips = args.filmstrips === "0" ? [] : await buildFilmstrips(browser, baseUrl, outDir);
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    fixedThresholdNdc: 0.35,
    viewportReports,
    filmstrips,
  };
  const filmstripsRequired = args.filmstrips !== "0";
  report.passed = viewportReports.every((viewport) =>
    viewport.errors.length === 0 &&
    viewport.results.every((result) => result.passed) &&
    viewport.stats.ship.routeGatePassed &&
    viewport.stats.crewScenario.passed &&
    viewport.stats.mechanismScenario.passed &&
    viewport.stats.shipMaterialCards.cards.length === 4 &&
    viewport.stats.shipMaterialCards.textureDrawingInCode === false &&
    Object.values(viewport.shipViews).every((view) =>
      view.render.calls > 0 && view.render.triangles > 0) &&
    viewport.stats.silhouettes.length === 3 &&
    viewport.stats.silhouettes.every((option) =>
      option.render.calls > 0 && option.render.triangles > 0)) &&
    (!filmstripsRequired || filmstrips.every((strip) => strip.path && !strip.montageError));
  fs.writeFileSync(path.join(outDir, "verification-report.json"), JSON.stringify(report, null, 2));

  for (const viewport of viewportReports) {
    console.log(`\n=== ${viewport.view} ===`);
    for (const result of viewport.results) {
      console.log(
        `${result.scenario.padEnd(20)} max |NDC| x=${result.maxAbsNdcX} y=${result.maxAbsNdcY} ` +
        `samples=${result.samples} clamp=${result.screenClampCorrections} ${result.passed ? "PASS" : "FAIL"}`,
      );
    }
    console.log(`render calls=${viewport.stats.renderer.calls} triangles=${viewport.stats.renderer.triangles}`);
    console.log(
      `ship routes=${viewport.stats.ship.routes.length} gate=${viewport.stats.ship.routeGatePassed ? "PASS" : "FAIL"} ` +
      `crew=${viewport.stats.crewScenario.passed ? "PASS" : "FAIL"} ` +
      `mechanisms=${viewport.stats.mechanismScenario.passed ? "PASS" : "FAIL"}`,
    );
    for (const [mode, measurement] of Object.entries(viewport.shipViews)) {
      console.log(
        `ship ${mode.padEnd(9)} calls=${measurement.render.calls} ` +
        `triangles=${measurement.render.triangles} viewport=${measurement.camera.viewportCssPixels.join("x")}`,
      );
    }
    for (const option of viewport.stats.silhouettes) {
      console.log(
        `silhouette ${option.key} fixed-wide calls=${option.render.calls} ` +
        `triangles=${option.render.triangles} viewport=${option.camera.viewportCssPixels.join("x")}`,
      );
    }
    if (viewport.errors.length) console.log("errors:", viewport.errors);
  }
  for (const strip of filmstrips) {
    console.log(`filmstrip ${strip.scenario}: ${strip.path || strip.montageError}`);
  }
  console.log(`\nreport: ${path.join(outDir, "verification-report.json")}`);
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("SPACESHIP HARNESS FAIL:", error);
  process.exit(1);
});
