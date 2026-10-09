const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright-core");
// Headless check: serve this folder on :8777, then: node tools/e2e-show.js <file.wav|none> <secs> <tag>  (writes ./shots/<tag>.png)
require("fs").mkdirSync("./shots", { recursive: true });
(async () => {
  const [wav, secs, tag, extra] = [process.argv[2], Number(process.argv[3] || 14), process.argv[4], process.argv[5] || ""];
  const args = ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"];
  if (wav !== "none") args.push(`--use-file-for-fake-audio-capture=${wav}`);
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  await page.goto("http://localhost:8777/" + extra);
  await page.waitForTimeout(800);
  if (tag.includes("prestart")) await page.screenshot({ path: `./shots/${tag}.png` });
  if (wav !== "none") await page.keyboard.press("Space");
  else await page.evaluate(() => { running = false; });
  await page.waitForTimeout(secs * 1000);
  const info = await page.evaluate(() => ({ screen: EMOTIONS[targetKey].label, act: A.activity.toFixed(2), amp: A.amp.toFixed(2), ripples: RIPPLES.length,
    whisper: getComputedStyle(document.getElementById("whisper")).opacity, ops: getComputedStyle(document.getElementById("ops")).display,
    heard: lastDecision && lastDecision.top, q: typeof qLevel !== "undefined" ? qLevel : "-" }));
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(f); else res((n / 2).toFixed(0)); }; requestAnimationFrame(f); }));
  await page.screenshot({ path: `./shots/${tag}.png` });
  console.log(tag, JSON.stringify(info), "fps(headless swiftshader)=" + fps);
  if (tag === "joy") {
    await page.keyboard.press("7"); await page.waitForTimeout(1800);
    await page.screenshot({ path: `./shots/label-on-change.png` });
    console.log("after 7 whisper opacity:", await page.evaluate(() => getComputedStyle(whisperEl).opacity + " text=" + whisperEl.textContent));
    await page.waitForTimeout(6500);
    console.log("7s later whisper opacity:", await page.evaluate(() => getComputedStyle(whisperEl).opacity));
    await page.keyboard.press("d"); await page.waitForTimeout(800);
    await page.screenshot({ path: `./shots/demo-panel.png` });
    console.log("demo ops:", await page.evaluate(() => getComputedStyle(document.getElementById("ops")).display + " | " + moodName.textContent + " " + moodConf.textContent + " " + moodMode.textContent));
    await page.keyboard.press("a"); await page.keyboard.press("l"); await page.waitForTimeout(300);
    console.log("label-off class:", await page.evaluate(() => document.body.classList.contains("label-off")));
    await page.keyboard.press("l");
  }
  console.log("errors:", errs.length ? errs : "none");
  await browser.close();
})();
