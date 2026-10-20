// Copia de seguridad del progreso: todo lo que la wiki guarda en este navegador (claves wiki-diosesmon-*)
// se exporta a un archivo .json o a un código DIOSESMON-BK1: (gzip → base64url) y se importa en otro navegador.
(function respaldo() {
  const root = document.getElementById("backup");
  if (!root) return;
  const PREFIX = "wiki-diosesmon-";
  const CODE_PREFIX = "DIOSESMON-BK1:";
  // Lo que no se copia: la contraseña de admin (nunca debe viajar) y avisos de un solo uso.
  const SKIP = new Set(["wiki-diosesmon-admin-pass", "wiki-diosesmon-sonido-aviso"]);
  const $ = (selector) => root.querySelector(selector);
  const status = $("[data-bk-status]");
  const say = (html, tone = "") => { status.innerHTML = html; status.className = `bk-status${tone ? ` is-${tone}` : ""}`; };

  const readAll = () => {
    const data = {};
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith(PREFIX) && !SKIP.has(key)) data[key] = localStorage.getItem(key);
      }
    } catch { /* sin almacenamiento */ }
    return data;
  };
  const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };

  // Resumen legible de lo que hay en un respaldo.
  const summary = (data) => {
    const items = [];
    const dex = parse(data["wiki-diosesmon-pokedex-state-v1"], null);
    if (dex && typeof dex === "object") {
      const values = Object.values(dex);
      const caught = values.filter((entry) => entry?.caught).length;
      const seen = values.filter((entry) => entry?.seen).length;
      if (caught || seen) items.push(`📖 Pokédex: <strong>${caught}</strong> capturados y <strong>${seen}</strong> vistos`);
    }
    const gyms = parse(data["wiki-diosesmon-gyms-v1"], null);
    if (gyms && typeof gyms === "object") {
      const badges = Object.values(gyms).filter(Boolean).length;
      if (badges) items.push(`🏅 Gimnasios: <strong>${badges}</strong> marcados`);
    }
    const teams = parse(data["wiki-diosesmon-comp-teams"], null);
    const teamList = Array.isArray(teams) ? teams : Array.isArray(teams?.teams) ? teams.teams : null;
    if (teamList?.length) items.push(`⚔️ Competitivo: <strong>${teamList.length}</strong> equipo${teamList.length === 1 ? "" : "s"}`);
    const plans = parse(data["wiki-diosesmon-crianza-planes"], null);
    if (plans && Object.keys(plans).length) items.push(`🥚 Crianza: <strong>${Object.keys(plans).length}</strong> cadena${Object.keys(plans).length === 1 ? "" : "s"} con progreso`);
    const inventory = parse(data["wiki-diosesmon-crianza-inventario"], null);
    if (inventory?.bySex) {
      const total = Object.values(inventory.bySex).reduce((sum, box) => sum + (box.m || 0) + (box.f || 0) + (box.d || 0), 0);
      if (total) items.push(`📦 Inventario de 1x31: <strong>${total}</strong> Pokémon`);
    }
    const farm = parse(data["wiki-diosesmon-bayas-granja"], null);
    if (Array.isArray(farm) && farm.length) items.push(`🍓 Granja: <strong>${farm.length}</strong> bayas marcadas`);
    const guide = parse(data["wiki-diosesmon-guia-v1"], null);
    if (Array.isArray(guide) && guide.length) items.push(`✅ Guía: <strong>${guide.length}</strong> pasos hechos`);
    const others = Object.keys(data).length;
    return { items, keys: others };
  };
  const listHtml = ({ items, keys }) => (items.length ? `<ul class="bk-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "")
    + `<small class="bk-keys">${keys} dato${keys === 1 ? "" : "s"} guardado${keys === 1 ? "" : "s"} en total (también preferencias como el volumen o tu rango).</small>`;

  const drawCurrent = () => { $("[data-bk-current]").innerHTML = listHtml(summary(readAll())); };

  const payload = () => ({ app: "diosesmonwiki", v: 1, createdAt: new Date().toISOString(), data: readAll() });
  const toB64Url = (bytes) => { let text = ""; bytes.forEach((byte) => { text += String.fromCharCode(byte); }); return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const fromB64Url = (text) => { const raw = atob(text.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (char) => char.charCodeAt(0)); };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  async function makeCode() {
    const json = new TextEncoder().encode(JSON.stringify(payload()));
    if (typeof CompressionStream === "function") return CODE_PREFIX + toB64Url(await pipe(json, new CompressionStream("gzip")));
    return `${CODE_PREFIX}RAW:${toB64Url(json)}`;
  }
  async function readBackup(text) {
    let raw = String(text ?? "").trim();
    let json;
    if (raw.startsWith("{")) json = raw;
    else {
      raw = raw.replace(/\s+/g, "");
      if (!raw.startsWith(CODE_PREFIX)) throw new Error("No es un respaldo de la DiosesmonWiki.");
      raw = raw.slice(CODE_PREFIX.length);
      if (raw.startsWith("RAW:")) json = new TextDecoder().decode(fromB64Url(raw.slice(4)));
      else {
        if (typeof DecompressionStream !== "function") throw new Error("Tu navegador no puede leer el código: usa el archivo.");
        json = new TextDecoder().decode(await pipe(fromB64Url(raw), new DecompressionStream("gzip")));
      }
    }
    const value = JSON.parse(json);
    if (value?.app !== "diosesmonwiki" || !value.data || typeof value.data !== "object") throw new Error("El respaldo está incompleto.");
    const data = {};
    Object.entries(value.data).forEach(([key, item]) => { if (key.startsWith(PREFIX) && !SKIP.has(key) && typeof item === "string") data[key] = item; });
    return { data, createdAt: value.createdAt };
  }

  // --- Exportar ---
  $("[data-bk-download]").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(payload(), null, 1)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `diosesmonwiki-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    say("Archivo descargado. Ábrelo en el otro navegador con <strong>Cargar archivo</strong>.", "ok");
  });
  $("[data-bk-code]").addEventListener("click", async () => {
    const box = $("[data-bk-out]");
    box.value = await makeCode();
    box.hidden = false;
    box.select();
    try {
      await navigator.clipboard.writeText(box.value);
      say(`Código copiado (${box.value.length.toLocaleString("es")} caracteres). Pégalo en el otro navegador y pulsa <strong>Leer código</strong>.`, "ok");
    } catch {
      say("Código listo: selecciónalo y cópialo (Ctrl+C).", "ok");
    }
  });

  // --- Importar ---
  let pending = null;
  const preview = (backup) => {
    pending = backup;
    const when = backup.createdAt ? new Date(backup.createdAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }) : "";
    $("[data-bk-preview]").hidden = false;
    $("[data-bk-preview-body]").innerHTML = `${when ? `<p>Respaldo del <strong>${when}</strong>:</p>` : ""}${listHtml(summary(backup.data))}`;
    say("Revisa lo que trae el respaldo y pulsa <strong>Restaurar</strong>.");
  };
  const fail = (error) => say(`No se pudo leer: ${error.message || "el respaldo no es válido."}`, "bad");
  $("[data-bk-file]").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { preview(await readBackup(await file.text())); } catch (error) { fail(error); }
  });
  $("[data-bk-paste]").addEventListener("click", async () => {
    const text = $("[data-bk-in]").value;
    if (!text.trim()) { say("Pega primero el código del otro navegador.", "bad"); return; }
    try { preview(await readBackup(text)); } catch (error) { fail(error); }
  });
  $("[data-bk-cancel]").addEventListener("click", () => { pending = null; $("[data-bk-preview]").hidden = true; say(""); });
  $("[data-bk-restore]").addEventListener("click", () => {
    if (!pending) return;
    const replace = $("[data-bk-replace]").checked;
    if (!window.confirm(replace ? "Se borrará el progreso de este navegador y se pondrá el del respaldo. ¿Seguir?" : "Se pondrá el progreso del respaldo (lo que no venga en él se conserva). ¿Seguir?")) return;
    try {
      if (replace) Object.keys(readAll()).forEach((key) => localStorage.removeItem(key));
      Object.entries(pending.data).forEach(([key, value]) => localStorage.setItem(key, value));
    } catch {
      say("Este navegador no deja guardar datos (¿modo incógnito?).", "bad");
      return;
    }
    say("¡Progreso restaurado! Recargando…", "ok");
    setTimeout(() => location.reload(), 900);
  });

  drawCurrent();
  window.addEventListener("storage", drawCurrent);
})();
