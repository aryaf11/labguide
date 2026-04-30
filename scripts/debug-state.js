/* eslint-disable */
const fs = require("fs");
const puppeteer = require("puppeteer-core");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    defaultViewport: { width: 480, height: 900, deviceScaleFactor: 1 },
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("PAGE ERR:", e.message));
  page.on("console", (m) => console.log("[browser]", m.type(), m.text()));
  await page.goto("http://127.0.0.1:3456", { waitUntil: "networkidle2" });
  await page.waitForSelector("#appScreens");

  await page.evaluate(() => {
    document.querySelector('[data-screen="splash"] [data-screen-go="specialty"]').click();
  });
  await sleep(300);
  await page.evaluate(() => {
    document.querySelector('[data-specialty="electric"]').click();
  });
  await sleep(500);
  await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-screen="devices"] .lab-card');
    cards[0].click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const opt = document.querySelector(".phone.is-active [data-screen-go='train3d1']");
    if (opt) opt.click();
  });
  await sleep(2500);

  const dump = await page.evaluate(() => {
    const m = document.querySelector('[data-screen="train3d1"] .machine');
    if (!m) return { err: "no machine" };
    const model = m.__labModel;
    if (!model) return { err: "no model" };
    const u = model.userData || {};
    let screenInfo = null;
    if (u.screen) screenInfo = { kind: u.screen.kind, hasCanvas: !!u.screen.canvas, hasCtx: !!u.screen.ctx };
    let traversedScreen = null;
    model.traverse((o) => {
      if (!traversedScreen && o.userData && o.userData.screen) {
        traversedScreen = { name: o.name || o.type, kind: o.userData.screen.kind };
      }
    });
    return {
      type: model.type,
      labSim: u.labSim || null,
      hasScreen: !!u.screen,
      screenInfo,
      traversedScreen,
    };
  });
  console.log(JSON.stringify(dump, null, 2));

  await page.evaluate(() => {
    const m = document.querySelector('[data-screen="train3d1"] .machine');
    const model = m.__labModel;
    const s = model.userData.labSim;
    s.powerOn = true;
    s.scopeRed = "ch1";
    s.scopeBlack = "gnd";
    s.modeIdx = 1;
  });
  await sleep(500);

  const after = await page.evaluate(() => {
    const m = document.querySelector('[data-screen="train3d1"] .machine');
    const model = m.__labModel;
    const s = model.userData.labSim;
    return {
      labSim: s,
      screenKind: model.userData.screen ? model.userData.screen.kind : null,
    };
  });
  console.log("AFTER:", JSON.stringify(after, null, 2));

  await browser.close();
})();
