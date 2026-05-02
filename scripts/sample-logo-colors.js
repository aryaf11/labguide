/* eslint-disable */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

(async () => {
  const file = path.resolve(__dirname, "..", "www", "assets", "brand", "labguide-logo.png");
  const b64 = fs.readFileSync(file).toString("base64");
  const dataUrl = "data:image/png;base64," + b64;

  const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c"></canvas>`);
  const result = await page.evaluate(async (url) => {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const c = document.getElementById("c");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const buckets = new Map();
    const STEP = 24;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 200) continue;
      const br = Math.round(r / STEP) * STEP;
      const bg = Math.round(g / STEP) * STEP;
      const bb = Math.round(b / STEP) * STEP;
      const k = br + "," + bg + "," + bb;
      const cur = buckets.get(k) || { c: 0, r: 0, g: 0, b: 0 };
      cur.c++; cur.r += r; cur.g += g; cur.b += b;
      buckets.set(k, cur);
    }
    return [...buckets.entries()]
      .map(([k, v]) => ({
        c: v.c,
        r: Math.round(v.r / v.c),
        g: Math.round(v.g / v.c),
        b: Math.round(v.b / v.c),
      }))
      .sort((a, b) => b.c - a.c)
      .slice(0, 10);
  }, dataUrl);
  await browser.close();
  for (const p of result) {
    const hex = "#" + [p.r, p.g, p.b].map((n) => n.toString(16).padStart(2, "0")).join("");
    console.log(hex, "count=" + p.c);
  }
})();
