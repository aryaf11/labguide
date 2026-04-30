/* eslint-disable */
// Capture real screenshots of each lab device's 3D model + screen.
// Usage: node scripts/capture-screens.js [baseUrl] [outDir]

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE_URL = process.argv[2] || "http://127.0.0.1:3456";
const OUT_DIR = path.resolve(process.argv[3] || path.join(__dirname, "..", "assets", "screens"));

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const DEVICES = [
  { id: "oscilloscope", title: "Oscilloscope" },
  { id: "breadboard", title: "Breadboard" },
  { id: "multimeter", title: "Multimeter" },
  { id: "power-supply", title: "Power Supply" },
  { id: "function-generator", title: "Function Generator" },
  { id: "spectrum", title: "Spectrum Analyzer" },
];

function findExecutable() {
  for (const p of EDGE_PATHS) if (fs.existsSync(p)) return p;
  throw new Error("No Chromium-based browser found.");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resetToSplash(page) {
  await page.evaluate(() => {
    if (window.__navReset) return;
    window.__navReset = true;
  });
  await page.goto(page.url(), { waitUntil: "networkidle2" });
  await page.waitForSelector("#appScreens");
}

async function navigateToDevice(page, deviceId) {
  await resetToSplash(page);
  await sleep(300);

  await page.evaluate(() => {
    document.querySelector('[data-screen="splash"] [data-screen-go="specialty"]').click();
  });
  await sleep(350);

  await page.evaluate(() => {
    document.querySelector('[data-specialty="electric"]').click();
  });
  await sleep(500);

  const ok = await page.evaluate((id) => {
    const cards = document.querySelectorAll('[data-screen="devices"] .lab-card');
    const titleMap = {
      oscilloscope: "Oscilloscope",
      breadboard: "Breadboard",
      multimeter: "Multimeter",
      "power-supply": "DC",
      "function-generator": "مولد الإشارة",
      spectrum: "محلل الطيف",
    };
    const arNeedle = {
      oscilloscope: "راسم الإشارة",
      breadboard: "لوحة التجارب",
      multimeter: "جهاز القياس المتعدد",
      "power-supply": "مصدر الطاقة",
      "function-generator": "مولد الإشارة",
      spectrum: "محلل الطيف",
    };
    for (const c of cards) {
      const title = c.querySelector(".label")?.textContent || "";
      if (
        (titleMap[id] && title.includes(titleMap[id])) ||
        (arNeedle[id] && title.includes(arNeedle[id]))
      ) {
        c.click();
        return true;
      }
    }
    return false;
  }, deviceId);
  if (!ok) {
    console.warn("  could not find card for", deviceId);
    return false;
  }
  await sleep(450);

  await page.evaluate(() => {
    const opt = document.querySelector(".phone.is-active [data-screen-go='train3d1']");
    if (opt) opt.click();
  });
  await sleep(2500);
  return true;
}

async function powerOnDevice(page, deviceId) {
  await page.evaluate((id) => {
    const m = document.querySelector('[data-screen="train3d1"] .machine');
    if (!m) return;
    const model = m.__labModel;
    if (!model || !model.userData || !model.userData.labSim) return;
    const s = model.userData.labSim;
    s.powerOn = true;
    s.bbPower = true;
    s.outputOn = true;
    s.modeIdx = id === "function-generator" ? 2 : 1;
    if (id === "oscilloscope") {
      s.scopeRed = "ch1";
      s.scopeBlack = "gnd";
    } else if (id === "multimeter") {
      s.mmBlack = "com";
      s.mmRed = "vohm";
    } else if (id === "breadboard") {
      s.railP = true;
      s.railN = true;
      s.bridgeA = true;
      s.bridgeB = true;
    } else if (id === "power-supply") {
      s.psuRed = "plus";
      s.psuBlack = "minus";
    } else if (id === "function-generator") {
      s.fgRed = "outp";
      s.fgBlack = "outn";
    }
    let count = 6;
    let dial = null;
    model.traverse((o) => {
      if (o.isMesh && o.userData.labInteractive && o.userData.labInteractive.role === "labDial" && !dial) {
        dial = o;
      }
    });
    if (dial) dial.rotation.y = (s.modeIdx * (Math.PI * 2)) / count;
    const panel = model.userData.labPanelEl;
    if (panel && typeof window.refreshLabSimulationDisplay === "function") {
      window.refreshLabSimulationDisplay(panel, model);
    }
  }, deviceId);
  await sleep(1800);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const exe = findExecutable();
  console.log("Using browser:", exe);
  console.log("Base URL:", BASE_URL);
  console.log("Output dir:", OUT_DIR);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: "new",
    defaultViewport: { width: 480, height: 900, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--disable-features=IsolateOrigins,site-per-process"],
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
    page.on("console", (msg) => {
      const t = msg.type();
      if (t === "error" || t === "warning") console.log("[browser:" + t + "]", msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("#appScreens", { timeout: 10000 });

    for (const d of DEVICES) {
      console.log("\n=== Capturing", d.id);
      try {
        const navOk = await navigateToDevice(page, d.id);
        if (!navOk) continue;
        await page.waitForFunction(
          () => {
            const m = document.querySelector('[data-screen="train3d1"].is-active .machine');
            return m && (m.querySelector("canvas") || m.__labModel);
          },
          { timeout: 15000 }
        );
        await powerOnDevice(page, d.id);

        const machineHandle = await page.$('[data-screen="train3d1"].is-active .machine');
        if (!machineHandle) {
          console.warn("  no machine element");
          continue;
        }
        const debug = await page.evaluate(() => {
          const m = document.querySelector('[data-screen="train3d1"].is-active .machine');
          const model = m && m.__labModel;
          if (!model) return { err: "no-model" };
          const panel = model.userData.labPanelEl;
          const lcd = panel ? panel.querySelector(".mm-lcd-main") : null;
          return {
            powerOn: model.userData.labSim && model.userData.labSim.powerOn,
            modeIdx: model.userData.labSim && model.userData.labSim.modeIdx,
            lcd: lcd ? lcd.textContent : null,
            kind: model.userData.screen && model.userData.screen.kind,
          };
        });
        console.log("  debug:", debug);

        const outDevice = path.join(OUT_DIR, `${d.id}-device.png`);
        await machineHandle.screenshot({ path: outDevice });
        console.log("  saved", outDevice);

        const dataUrl = await page.evaluate(() => {
          const m = document.querySelector('[data-screen="train3d1"].is-active .machine');
          const model = m && m.__labModel;
          if (!model || !model.userData.screen) return null;
          return model.userData.screen.canvas.toDataURL("image/png");
        });
        if (dataUrl) {
          const b64 = dataUrl.split(",")[1];
          const outScr = path.join(OUT_DIR, `${d.id}-screen.png`);
          fs.writeFileSync(outScr, Buffer.from(b64, "base64"));
          console.log("  saved", outScr);
        }
      } catch (err) {
        console.error("  failed", d.id, err.message);
      }
    }

    const composite = await page.evaluate(async (devices) => {
      const W = 480, H = 360, COLS = 2, GAP = 24, TITLE_H = 44;
      const ROWS = Math.ceil(devices.length / COLS);
      const cw = COLS * W + (COLS + 1) * GAP;
      const ch = ROWS * (H + TITLE_H + GAP) + GAP;
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, "#0b1d3a");
      grad.addColorStop(1, "#031024");
      g.fillStyle = grad;
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = "#f1f5f9";
      g.font = "bold 22px system-ui, -apple-system, Segoe UI, Tahoma";
      g.textAlign = "left";
      return { cw, ch, COLS, ROWS, W, H, GAP, TITLE_H };
    }, DEVICES);
    console.log("\nLayout:", composite);

    const compPath = path.join(OUT_DIR, "all-devices.png");
    await composeLocal(compPath, DEVICES, OUT_DIR);
    console.log("Composite saved:", compPath);
  } finally {
    await browser.close();
  }
}

async function composeLocal(outPath, devices, dir) {
  const { createCanvas, loadImage } = (() => {
    try {
      return require("canvas");
    } catch {
      return null;
    }
  })() || {};
  if (!createCanvas) {
    console.log("(node-canvas not installed; skipping composite)");
    return;
  }
  const W = 480, H = 360, COLS = 2, GAP = 24, TITLE_H = 44;
  const ROWS = Math.ceil(devices.length / COLS);
  const cw = COLS * W + (COLS + 1) * GAP;
  const ch = ROWS * (H + TITLE_H + GAP) + GAP;
  const c = createCanvas(cw, ch);
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, "#0b1d3a");
  grad.addColorStop(1, "#031024");
  g.fillStyle = grad;
  g.fillRect(0, 0, cw, ch);
  g.fillStyle = "#f1f5f9";
  g.font = "bold 22px sans-serif";
  for (let i = 0; i < devices.length; i++) {
    const r = Math.floor(i / COLS);
    const cIdx = i % COLS;
    const x = GAP + cIdx * (W + GAP);
    const y = GAP + r * (H + TITLE_H + GAP);
    g.fillStyle = "#7dd3fc";
    g.fillText(devices[i].title, x + 4, y + 26);
    try {
      const img = await loadImage(path.join(dir, devices[i].id + ".png"));
      g.drawImage(img, x, y + TITLE_H, W, H);
    } catch {}
  }
  fs.writeFileSync(outPath, c.toBuffer("image/png"));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
