// Miniaturas de las decoraciones de Halloween (assets/img/halloween3d/<id>.png) con el visor de la web.
// Necesita la wiki servida en local (python -m http.server 8000) y puppeteer-core con Chrome:
//   node tools/render_halloween3d.js [http://localhost:8000]
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = process.argv[2] || "http://localhost:8000";
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "img", "halloween3d");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

(async () => {
  const index = fs.readFileSync(path.join(ROOT, "data", "halloween-decor.js"), "utf8");
  const decor = JSON.parse(index.slice(index.indexOf("["), index.lastIndexOf("]") + 1));
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error(error.message));
  await page.goto(`${BASE}/feedback.html`, { waitUntil: "load" });
  await page.addScriptTag({ url: THREE_URL });
  await page.addScriptTag({ url: `${BASE}/assets/js/model3d.js?render=${Date.now()}` });
  await page.evaluate(() => {
    document.body.innerHTML = '<div id="r" style="width:256px;height:256px"></div>';
    window.viewer = window.MCModel3D.create(document.getElementById("r"), { interactive: false });
  });
  fs.mkdirSync(OUT, { recursive: true });
  for (const item of decor) {
    const data = await page.evaluate(async (id) => {
      await window.viewer.load(`assets/models3d/halloween/${id}.json`);
      await new Promise((resolve) => setTimeout(resolve, 60));
      return window.viewer.snapshot();
    }, item.id);
    fs.writeFileSync(path.join(OUT, `${item.id}.png`), Buffer.from(data.split(",")[1], "base64"));
  }
  await browser.close();
  console.log(`${decor.length} miniaturas en ${path.relative(ROOT, OUT)}`);
})();
