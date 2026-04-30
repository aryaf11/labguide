/* eslint-disable */
const fs = require("fs");
const path = require("path");
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
  await page.goto("http://127.0.0.1:3456", { waitUntil: "networkidle2" });
  await page.waitForSelector("#appScreens");

  await page.evaluate(() => {
    document.querySelector('[data-screen="splash"] [data-screen-go="specialty"]').click();
  });
  await sleep(300);
  await page.evaluate(() => document.querySelector('[data-specialty="electric"]').click());
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

  await page.evaluate(() => {
    const m = document.querySelector('[data-screen="train3d1"] .machine');
    const model = m.__labModel;
    const s = model.userData.labSim;
    s.powerOn = true;
    s.scopeRed = "ch1";
    s.scopeBlack = "gnd";
    s.modeIdx = 1;
  });
  await sleep(1500);

  const dataUrl = await page.evaluate(() => {
    const m = document.querySelector('[data-screen="train3d1"] .machine');
    const model = m.__labModel;
    if (!model.userData.screen) return null;
    return model.userData.screen.canvas.toDataURL("image/png");
  });

  if (!dataUrl) {
    console.log("no canvas");
  } else {
    const b64 = dataUrl.split(",")[1];
    const out = path.join(__dirname, "..", "assets", "screens", "_oscilloscope_canvas.png");
    fs.writeFileSync(out, Buffer.from(b64, "base64"));
    console.log("Saved canvas:", out);
  }

  await browser.close();
})();
