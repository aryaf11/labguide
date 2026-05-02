/* eslint-disable */
const path = require("path");
const puppeteer = require("puppeteer-core");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    defaultViewport: { width: 480, height: 900, deviceScaleFactor: 2 },
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3456", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 800));
  const out = path.resolve(__dirname, "..", "assets", "screens", "splash-new.png");
  await page.screenshot({ path: out, fullPage: false });
  console.log("Saved:", out);
  await browser.close();
})();
