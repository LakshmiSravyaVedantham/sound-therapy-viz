// Control window: mirrors the stage's operator panel and sends commands. Same browser, same origin.
(() => {
  const $ = (id) => document.getElementById(id);
  const ops = $("ops"), link = $("ctl-link"), hint = $("ctl-hint"), toastEl = $("toast");
  let stageWin = null, lastState = 0, info = null, pointerDown = false, toastTimer = null;

  function transport(onMsg) {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel("stv-presenter");
      ch.onmessage = (e) => onMsg(e.data || {});
      return (m) => ch.postMessage(m);
    }
    window.addEventListener("storage", (e) => { if (e.key === "stv-pres-s" && e.newValue) { try { onMsg(JSON.parse(e.newValue).m || {}); } catch (_) {} } });
    return (m) => { if (m.file) return; try { localStorage.setItem("stv-pres-c", JSON.stringify({ m, n: Math.random() })); } catch (_) {} };
  }
  const send = transport(onMsg);

  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2600);
  }
  function onMsg(m) {
    if (m.t === "state") {
      lastState = performance.now(); info = m.info || {};
      if (!pointerDown) { ops.innerHTML = m.html; ops.classList.remove("stale"); }
      renderLink();
    } else if (m.t === "toast") toast(m.msg);
    else if (m.t === "stage-bye") { lastState = 0; renderLink(); }
  }
  function renderLink() {
    const ok = performance.now() - lastState < 1500;
    link.classList.toggle("ok", ok);
    ops.classList.toggle("stale", !ok);
    if (!ok) { link.textContent = "stage: not connected"; hint.textContent = ""; return; }
    link.textContent = "stage connected · build " + (info.build || "?") + (info.fullscreen ? " · fullscreen" : "") + (info.show ? " · show mode" : "");
    hint.textContent = !info.running
      ? "Sound is not started. Click once on the stage window (or press Space here) to start the mic."
      : info.audio === "suspended"
        ? "Audio is paused by the browser. Click once on the stage window."
        : !info.fullscreen ? "Tip: drag the stage window to the projector, click it, press F." : "";
  }
  // heartbeat: stage stays in stage mode (no panel) while this window is open
  send({ t: "hello" });
  setInterval(() => { send({ t: "hello" }); renderLink(); }, 1000);
  window.addEventListener("pagehide", () => send({ t: "bye" }));

  // buttons inside the mirrored panel
  ops.addEventListener("pointerdown", (e) => { if (e.target.closest("input[type=range]")) pointerDown = true; });
  window.addEventListener("pointerup", () => { pointerDown = false; });
  ops.addEventListener("click", (e) => {
    const fileLabel = e.target.closest(".file-btn");
    if (fileLabel) { e.preventDefault(); $("ctl-file").click(); return; }
    const btn = e.target.closest("button[id]");
    if (btn) { e.preventDefault(); if (btn.id === "btn-fs") return showMode(); send({ t: "click", id: btn.id }); return; }
    const li = e.target.closest(".kh-mood[data-k]");
    if (li) { const k = Number(li.dataset.k); const d = k === 10 ? "0" : k === 11 ? "-" : String(k); send({ t: "key", key: d, code: k === 11 ? "Minus" : "Digit" + d }); }
  });
  ops.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id) { send({ t: "input", id: t.id, value: t.value }); const v = $("ai-weight-val"); if (t.id === "ai-weight" && v) v.textContent = t.value + "%"; }
  });

  function openStage() {
    const url = new URL("index.html", location.href);
    url.search = "?stage=1";
    stageWin = window.open(url.href, "stv-stage", "popup,width=1280,height=720");
    if (!stageWin) toast("Popup blocked: allow popups for this page, or open " + url.href + " yourself");
    else toast("Stage opened. Drag it to the projector, click it once, press F.");
  }
  function showMode() {
    // Browsers only allow fullscreen from a click inside that window, so try directly, then ask the stage.
    let ok = false;
    try { if (stageWin && !stageWin.closed && stageWin.document.documentElement.requestFullscreen) { stageWin.document.documentElement.requestFullscreen().then(() => {}, () => {}); ok = true; } } catch (_) {}
    send({ t: "key", key: "f", code: "KeyF" });
    toast(ok ? "Asked the stage to go fullscreen. If it did not, click the stage window and press F." : "Click the stage window and press F for fullscreen show mode.");
  }
  $("ctl-open").addEventListener("click", openStage);
  $("ctl-show").addEventListener("click", showMode);
  $("ctl-start").addEventListener("click", () => send({ t: "start" }));
  $("ctl-track").addEventListener("click", () => $("ctl-file").click());
  $("ctl-file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) { send({ t: "file", file: f }); toast("Sent " + f.name + " to the stage"); }
    e.target.value = "";
  });

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.tagName === "INPUT" && e.target.type !== "range") return;
    const key = e.key.toLowerCase();
    if (key === "d") return; // panel lives here; nothing to toggle on the stage
    if (key === "o") { $("ctl-file").click(); return; }
    if (key === "f") { showMode(); return; }
    if (e.code === "Space") { e.preventDefault(); send({ t: "start" }); return; }
    if (e.key.length === 1 || /^(Digit|Numpad)/.test(e.code)) send({ t: "key", key: e.key, code: e.code, shift: e.shiftKey });
  });
})();
