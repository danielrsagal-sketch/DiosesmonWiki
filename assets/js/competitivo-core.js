// Competitivo: datos, cálculos, formato Showdown y código para compartir.
// Sin DOM: la interfaz está en competitivo.js.
(function () {
  "use strict";
  const D = window.DIOSESMON_COMP;
  const B64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  const B64_INDEX = Object.fromEntries([...B64].map((c, i) => [c, i]));
  const STAT_KEYS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
  const STAT_SHORT = ["PS", "Atq", "Def", "AtE", "DfE", "Vel"];
  const TYPE_COLORS = ["#9fa19f", "#ff8000", "#81b9ef", "#9141cb", "#915121", "#afa981", "#91a119", "#704170", "#60a1b8",
    "#e62829", "#2980ef", "#3fa129", "#fac000", "#ef4179", "#3dcef3", "#5060e1", "#624d4e", "#ef70ef"];
  const CATEGORY = [
    { short: "Est.", label: "Estado", cls: "is-status" },
    { short: "Fís.", label: "Físico", cls: "is-phys" },
    { short: "Esp.", label: "Especial", cls: "is-spec" },
  ];
  const ITEM_CATS = {
    of: "Ofensivo", ve: "Velocidad", de: "Defensivo", so: "Soporte", ba: "Bayas", cr: "Crianza y EVs", mg: "Megapiedras",
  };

  const toID = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const norm = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

  // ---------- Índices ----------
  const species = D.species.map((s, index) => ({
    index, id: toID(s.en), num: s.n, es: s.es, en: s.en, types: s.t, base: s.b,
    abilities: s.a, hidden: s.h, sprite: s.s || s.n, form: s.f || null, treasure: !!s.tr, canEvolve: !!s.ev, raw: s.m,
    search: norm(`${s.es} ${s.en} ${s.n}`),
  }));
  const speciesById = new Map(species.map((s) => [s.id, s]));
  const speciesByEs = new Map(species.map((s) => [toID(s.es), s]));
  const moves = D.moves.map((m, index) => ({
    index, id: toID(m[1]), es: m[0], en: m[1], type: m[2], cat: m[3], power: m[4], acc: m[5], pp: m[6], prio: m[7],
  }));
  const moveById = new Map(moves.map((m) => [m.id, m]));
  const moveByEs = new Map(moves.map((m) => [toID(m.es), m]));
  const abilities = D.abilities.map((a, index) => ({ index, es: a[0], en: a[1], id: toID(a[1]) }));
  const abilityById = new Map(abilities.map((a) => [a.id, a]));
  const items = D.items.map((it) => ({ id: it[0], es: it[1], en: it[2], cat: it[3], effect: it[4], sid: toID(it[2]) }));
  // Megapiedras y prismas de las Regresiones Primigenias, sacados de data/megas-data.js (solo las megas disponibles).
  const MG = window.DIOSESMON_MEGAS;
  if (MG) {
    const PRIMAL_ORBS = { groudon: ["red_orb", "Prisma Rojo", "Red Orb"], kyogre: ["blue_orb", "Prisma Azul", "Blue Orb"] };
    const enName = (id) => id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    for (const m of MG.megas) {
      if (!m.available) continue;
      const orb = m.kind === "primal" ? PRIMAL_ORBS[toID(m.base)] : null;
      if (!m.stone && !orb) continue;
      const [id, es, en] = orb || [m.stone.id, m.stone.name, enName(m.stone.id)];
      const effect = orb
        ? `Hace que ${m.base} entre en combate como ${m.name} (${m.types.join("/")}).`
        : `Permite a ${m.base} megaevolucionar a ${m.name} (${m.types.join("/")}). Necesita ${MG.bracelet.name}.`;
      items.push({ id, es, en, cat: "mg", effect, sid: toID(en), mega: m, icon: m.stone ? m.stone.icon : null });
    }
  }
  // Las formas regionales (Raichu de Alola, Slowbro de Galar) no megaevolucionan.
  const megaFits = (it, sp) => !!(it && it.mega && it.mega.dex === sp.num && !sp.form);
  const megaStoneFor = (sp) => items.filter((it) => megaFits(it, sp));
  // Forma de combate (mega o primigenia) de un set: copia del Pokémon con la especie, tipos,
  // stats base y habilidad de la mega. Las especies virtuales «mega:<clave>» solo existen en el índice.
  function battleForm(mon) {
    const sp = speciesById.get(mon.sp);
    if (!sp || !MG) return null;
    const it = itemById.get(mon.item);
    let m = megaFits(it, sp) ? it.mega : null;
    if (!m && !sp.form && mon.moves.includes("dragonascent")) m = MG.megas.find((x) => x.available && x.dex === sp.num && !x.stone && x.kind === "mega") || null;
    if (!m) return null;
    const id = `mega:${m.key}`;
    if (!speciesById.has(id)) {
      const typeIdx = m.types.map((es) => types.findIndex((t) => t.es === es)).filter((i) => i >= 0);
      const b = m.stats;
      speciesById.set(id, { ...sp, id, es: m.name, en: m.name, types: typeIdx.length ? typeIdx : sp.types,
        base: [b.hp, b.atk, b.def, b.spa, b.spd, b.spe], sprite: m.pokeapi || sp.sprite, mega: m, baseId: sp.id });
    }
    const ab = m.abilities[0];
    return { mon: { ...mon, sp: id, ab: ab ? ab.id : mon.ab }, mega: m, ability: ab ? ab.name : "" };
  }
  const itemById = new Map(items.map((it) => [it.id, it]));
  const itemBySid = new Map(items.map((it) => [it.sid, it]));
  const itemByEs = new Map(items.map((it) => [toID(it.es), it]));
  const natures = D.natures.map((n) => ({ es: n[0], en: n[1], id: toID(n[1]), up: n[2], down: n[3] }));
  const natureById = new Map(natures.map((n) => [n.id, n]));
  const natureByEs = new Map(natures.map((n) => [toID(n.es), n]));
  const types = D.types.map((t, index) => ({ index, es: t[0], en: t[1], color: TYPE_COLORS[index] }));

  const learnCache = new Map();
  function learnset(sp) {
    if (!sp) return new Map();
    if (learnCache.has(sp.index)) return learnCache.get(sp.index);
    const map = new Map();
    const raw = sp.raw;
    let i = 0;
    while (i < raw.length) {
      const move = B64_INDEX[raw[i]] * 64 + B64_INDEX[raw[i + 1]];
      const bits = B64_INDEX[raw[i + 2]];
      i += 3;
      let level = null;
      if (bits & 1) { level = B64_INDEX[raw[i]] * 64 + B64_INDEX[raw[i + 1]]; i += 2; }
      map.set(moves[move].id, { move: moves[move], bits, level });
    }
    learnCache.set(sp.index, map);
    return map;
  }
  function methodLabels(entry) {
    const out = [];
    if (entry.bits & 1) out.push(entry.level === 0 ? "Evolución" : `Nv. ${entry.level}`);
    if (entry.bits & 2) out.push("MT");
    if (entry.bits & 4) out.push("Huevo");
    if (entry.bits & 8) out.push("Tutor");
    return out;
  }
  function speciesAbilities(sp) {
    if (!sp) return [];
    const list = sp.abilities.map((i) => ({ ability: abilities[i], hidden: false }));
    if (sp.hidden >= 0) list.push({ ability: abilities[sp.hidden], hidden: true });
    return list;
  }

  // ---------- Pokémon y equipos ----------
  function blankMon(spId) {
    const sp = speciesById.get(spId);
    const abil = speciesAbilities(sp)[0];
    return {
      sp: spId, nick: "", lvl: 100, ab: abil ? abil.ability.id : "", item: "", nat: "hardy",
      evs: [0, 0, 0, 0, 0, 0], ivs: [31, 31, 31, 31, 31, 31], moves: ["", "", "", ""],
    };
  }
  function sanitizeMon(raw) {
    if (!raw || !speciesById.has(raw.sp)) return null;
    const mon = blankMon(raw.sp);
    const sp = speciesById.get(raw.sp);
    mon.nick = typeof raw.nick === "string" ? raw.nick.slice(0, 18) : "";
    mon.lvl = clampInt(raw.lvl, 1, 100, 100);
    if (speciesAbilities(sp).some((a) => a.ability.id === raw.ab)) mon.ab = raw.ab;
    if (itemById.has(raw.item)) mon.item = raw.item;
    if (natureById.has(raw.nat)) mon.nat = raw.nat;
    if (Array.isArray(raw.evs)) mon.evs = mon.evs.map((_, i) => clampInt(raw.evs[i], 0, 252, 0));
    let total = mon.evs.reduce((a, b) => a + b, 0);
    for (let i = 5; i >= 0 && total > 510; i--) { const cut = Math.min(mon.evs[i], total - 510); mon.evs[i] -= cut; total -= cut; }
    if (Array.isArray(raw.ivs)) mon.ivs = mon.ivs.map((_, i) => clampInt(raw.ivs[i], 0, 31, 31));
    const ls = learnset(sp);
    if (Array.isArray(raw.moves)) {
      const seen = new Set();
      mon.moves = [0, 1, 2, 3].map((i) => {
        const id = raw.moves[i];
        if (!id || !ls.has(id) || seen.has(id)) return "";
        seen.add(id);
        return id;
      });
    }
    return mon;
  }
  function clampInt(value, min, max, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function natureMult(nat, stat) {
    if (!nat || nat.up === nat.down) return 1;
    if (nat.up === stat) return 1.1;
    if (nat.down === stat) return 0.9;
    return 1;
  }
  function calcStats(mon) {
    const sp = speciesById.get(mon.sp);
    if (!sp) return [0, 0, 0, 0, 0, 0];
    const nat = natureById.get(mon.nat);
    const L = mon.lvl;
    return sp.base.map((base, i) => {
      const core = Math.floor(((2 * base + mon.ivs[i] + Math.floor(mon.evs[i] / 4)) * L) / 100);
      if (i === 0) return sp.num === 292 ? 1 : core + L + 10;
      return Math.floor((core + 5) * natureMult(nat, i));
    });
  }
  const evTotal = (mon) => mon.evs.reduce((a, b) => a + b, 0);

  // ---------- Tipos ----------
  const CODE = { 0: 0, 1: 0.5, 2: 1, 3: 2 };
  const eff = (att, def) => CODE[D.chart[att * 18 + def]];
  const effVs = (att, defTypes) => defTypes.reduce((m, t) => m * eff(att, t), 1);
  // Habilidades que cambian lo que recibe el Pokémon (por id de Showdown).
  const ABILITY_DEF = {
    levitate: { 4: 0 }, eartheater: { 4: 0 }, flashfire: { 9: 0 }, wellbakedbody: { 9: 0 },
    voltabsorb: { 12: 0 }, lightningrod: { 12: 0 }, motordrive: { 12: 0 },
    waterabsorb: { 10: 0 }, stormdrain: { 10: 0 }, dryskin: { 10: 0, 9: 1.25 }, sapsipper: { 11: 0 },
    primordialsea: { 9: 0 }, desolateland: { 10: 0 },
    thickfat: { 9: 0.5, 14: 0.5 }, heatproof: { 9: 0.5 }, waterbubble: { 9: 0.5 }, purifyingsalt: { 7: 0.5 }, fluffy: { 9: 2 },
  };
  function defensiveProfile(mon) {
    const sp = speciesById.get(mon.sp);
    const ab = ABILITY_DEF[mon.ab] || null;
    return types.map((t) => {
      // Turbulencia (Mega Rayquaza): nada es súper eficaz contra su parte Volador.
      let m = mon.ab === "deltastream" ? sp.types.reduce((acc, d) => acc * (d === 2 ? Math.min(1, eff(t.index, d)) : eff(t.index, d)), 1) : effVs(t.index, sp.types);
      if (ab && t.index in ab) m *= ab[t.index];
      if (mon.ab === "wonderguard" && m <= 1) m = 0;
      return m;
    });
  }
  // Habilidades que convierten los movimientos de tipo Normal (Piel Celeste, Piel Feérica, Dragonización…).
  const ATE = { aerilate: 2, pixilate: 17, refrigerate: 14, galvanize: 12, dragonize: 15 };
  const moveTypeFor = (mon, move) => (move.type === 0 && mon.ab in ATE ? ATE[mon.ab] : move.type);
  function offensiveMult(mon, move, defType) {
    let m = eff(moveTypeFor(mon, move), defType);
    if (move.id === "freezedry" && defType === 10) m = 2;
    if ((mon.ab === "scrappy" || mon.ab === "mindseye") && defType === 7 && (move.type === 0 || move.type === 1)) m = 1;
    return m;
  }

  // ---------- Showdown ----------
  function exportShowdown(team) {
    const blocks = [];
    for (const mon of team.mons) {
      if (!mon) continue;
      const sp = speciesById.get(mon.sp);
      if (!sp) continue;
      const lines = [];
      const item = itemById.get(mon.item);
      const head = mon.nick && mon.nick !== sp.en ? `${mon.nick} (${sp.en})` : sp.en;
      lines.push(item ? `${head} @ ${item.en}` : head);
      const ab = abilityById.get(mon.ab);
      if (ab) lines.push(`Ability: ${ab.en}`);
      if (mon.lvl !== 100) lines.push(`Level: ${mon.lvl}`);
      const evs = mon.evs.map((v, i) => (v ? `${v} ${STAT_KEYS[i]}` : "")).filter(Boolean);
      if (evs.length) lines.push(`EVs: ${evs.join(" / ")}`);
      const nat = natureById.get(mon.nat);
      if (nat) lines.push(`${nat.en} Nature`);
      const ivs = mon.ivs.map((v, i) => (v !== 31 ? `${v} ${STAT_KEYS[i]}` : "")).filter(Boolean);
      if (ivs.length) lines.push(`IVs: ${ivs.join(" / ")}`);
      for (const id of mon.moves) { const mv = moveById.get(id); if (mv) lines.push(`- ${mv.en}`); }
      blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n") + (blocks.length ? "\n" : "");
  }

  const STAT_ALIASES = {
    hp: 0, ps: 0, atk: 1, attack: 1, atq: 1, ataque: 1, def: 2, defense: 2, defensa: 2,
    spa: 3, spatk: 3, specialattack: 3, ate: 3, atesp: 3, ataqueespecial: 3,
    spd: 4, spdef: 4, specialdefense: 4, dfe: 4, defesp: 4, defensaespecial: 4,
    spe: 5, speed: 5, vel: 5, velocidad: 5,
  };
  function findSpecies(name) {
    const id = toID(name);
    return speciesById.get(id) || speciesByEs.get(id) || null;
  }
  function parseStatLine(text, fallback, max, warn, label) {
    const out = fallback.slice();
    for (const part of text.split("/")) {
      const m = part.trim().match(/^(\d+)\s+(.+)$/);
      const idx = m ? STAT_ALIASES[toID(m[2])] : undefined;
      if (!m || idx === undefined) { if (part.trim()) warn(`${label}: no entiendo «${part.trim()}».`); continue; }
      out[idx] = Math.min(max, Number(m[1]));
      if (Number(m[1]) > max) warn(`${label}: ${m[1]} supera el máximo (${max}); se deja en ${max}.`);
    }
    return out;
  }
  // Devuelve { teams: [{name, mons}], warnings: [] }. Tolera nombres en español.
  function importShowdown(text) {
    const warnings = [];
    const teams = [];
    let current = null;
    const newTeam = (name) => { current = { name: name || "", mons: [] }; teams.push(current); };
    const blocks = [];
    let block = [];
    for (const rawLine of String(text).replace(/\r/g, "").split("\n")) {
      const line = rawLine.trim();
      const header = line.match(/^===\s*(?:\[[^\]]*\]\s*)?(.*?)\s*===$/);
      if (header) { if (block.length) blocks.push(block); block = []; blocks.push({ header: header[1] }); continue; }
      if (!line) { if (block.length) blocks.push(block); block = []; continue; }
      block.push(line);
    }
    if (block.length) blocks.push(block);
    for (const b of blocks) {
      if (!Array.isArray(b)) { newTeam(b.header); continue; }
      if (!current) newTeam("");
      const mon = parseBlock(b, (msg) => warnings.push(msg));
      if (!mon) continue;
      if (current.mons.length >= 6) { warnings.push(`Más de 6 Pokémon en «${current.name || "el equipo"}»: se ignora ${speciesById.get(mon.sp).es}.`); continue; }
      current.mons.push(mon);
    }
    return { teams: teams.filter((t) => t.mons.length), warnings };
  }
  function parseBlock(lines, warn) {
    let first = lines[0];
    let itemName = "";
    const at = first.lastIndexOf(" @ ");
    if (at >= 0) { itemName = first.slice(at + 3).trim(); first = first.slice(0, at).trim(); }
    first = first.replace(/\s*\((M|F|H|♂|♀)\)\s*$/i, "").trim();
    let nick = "";
    let spName = first;
    const m = first.match(/^(.*\S)\s*\(([^()]+)\)$/);
    if (m) { nick = m[1]; spName = m[2]; }
    const sp = findSpecies(spName);
    if (!sp) {
      warn(`«${spName}» no es un Pokémon disponible en Diosesmon (solo gen 1-4, sus formas regionales y los legendarios de Tesoros): se omite.`);
      return null;
    }
    const label = sp.es;
    const mon = blankMon(sp.id);
    if (nick && toID(nick) !== sp.id) mon.nick = nick.slice(0, 18);
    if (itemName) {
      const item = itemBySid.get(toID(itemName)) || itemByEs.get(toID(itemName));
      if (item) mon.item = item.id;
      else warn(`${label}: el objeto «${itemName}» no está en la lista de objetos competitivos de Cobblemon 1.7.3; se deja sin objeto.`);
    }
    const ls = learnset(sp);
    const pickedMoves = [];
    let evsSeen = false;
    for (const line of lines.slice(1)) {
      let mm;
      if ((mm = line.match(/^(Ability|Habilidad)\s*:\s*(.+)$/i))) {
        const id = toID(mm[2]);
        const ab = speciesAbilities(sp).find((a) => a.ability.id === id || toID(a.ability.es) === id);
        if (ab) mon.ab = ab.ability.id;
        else warn(`${label}: no puede tener la habilidad «${mm[2]}»; se usa ${abilityById.get(mon.ab)?.es || "la primera"}.`);
      } else if ((mm = line.match(/^(Level|Nivel)\s*:\s*(\d+)/i))) {
        mon.lvl = clampInt(mm[2], 1, 100, 100);
      } else if ((mm = line.match(/^EVs\s*:\s*(.+)$/i))) {
        mon.evs = parseStatLine(mm[1], [0, 0, 0, 0, 0, 0], 252, warn, `${label} (EVs)`);
        evsSeen = true;
      } else if ((mm = line.match(/^IVs\s*:\s*(.+)$/i))) {
        mon.ivs = parseStatLine(mm[1], [31, 31, 31, 31, 31, 31], 31, warn, `${label} (IVs)`);
      } else if ((mm = line.match(/^(?:(.+)\s+Nature|Naturaleza\s*:?\s*(.+))$/i))) {
        const id = toID(mm[1] || mm[2]);
        const nat = natureById.get(id) || natureByEs.get(id);
        if (nat) mon.nat = nat.id;
        else warn(`${label}: naturaleza «${mm[1] || mm[2]}» desconocida.`);
      } else if ((mm = line.match(/^[-~]\s*(.+)$/))) {
        let moveName = mm[1].trim();
        const hp = moveName.match(/^Hidden Power\s*\[?.*$/i);
        if (hp) moveName = "Hidden Power";
        const mv = moveById.get(toID(moveName)) || moveByEs.get(toID(moveName));
        if (!mv) warn(`${label}: el movimiento «${moveName}» no lo aprende ningún Pokémon del servidor (o es Legacy).`);
        else if (!ls.has(mv.id)) warn(`${label}: no puede aprender ${mv.es} jugando en Cobblemon 1.7.3 (quizá es Legacy); se omite.`);
        else if (pickedMoves.includes(mv.id)) warn(`${label}: ${mv.es} está repetido.`);
        else if (pickedMoves.length >= 4) warn(`${label}: más de 4 movimientos, se ignora ${mv.es}.`);
        else pickedMoves.push(mv.id);
      } else if (/^(Shiny|Happiness|Tera Type|Gigantamax|Dynamax Level|Pokeball|Gender|Hidden Power)\s*:/i.test(line)) {
        // Datos de Showdown que no afectan al constructor.
      } else {
        warn(`${label}: línea no reconocida «${line}».`);
      }
    }
    mon.moves = [0, 1, 2, 3].map((i) => pickedMoves[i] || "");
    const total = evTotal(mon);
    if (total > 510) {
      warn(`${label}: los EVs suman ${total} (máximo 510); se recortan.`);
      return sanitizeMon(mon);
    }
    if (!evsSeen) mon.evs = [0, 0, 0, 0, 0, 0];
    return mon;
  }

  // ---------- Código para compartir ----------
  // Código para compartir un equipo: DIOSESMON-EQ1: + JSON comprimido (gzip → base64url).
  const SHARE_PREFIX = "DIOSESMON-EQ1:";
  function packTeam(team) {
    return {
      n: team.name,
      s: team.size || 6,
      m: team.mons.filter(Boolean).map((p) => [p.sp, p.nick, p.lvl, p.ab, p.item, p.nat, p.evs, p.ivs, p.moves]),
    };
  }
  function unpackTeam(obj) {
    if (!obj || !Array.isArray(obj.m)) throw new Error("El código no contiene un equipo.");
    const warnings = [];
    const mons = [];
    for (const row of obj.m.slice(0, 6)) {
      if (!Array.isArray(row)) continue;
      const [sp, nick, lvl, ab, item, nat, evs, ivs, mvs] = row;
      const mon = sanitizeMon({ sp, nick, lvl, ab, item, nat, evs, ivs, moves: mvs });
      if (!mon) { warnings.push(`Pokémon desconocido «${sp}»: se omite.`); continue; }
      const lost = (mvs || []).filter((id) => id && !mon.moves.includes(id));
      if (lost.length) warnings.push(`${speciesById.get(sp).es}: se quitan movimientos que no reconozco (${lost.join(", ")}).`);
      mons.push(mon);
    }
    const size = [3, 4, 6].includes(obj.s) && obj.s >= mons.length ? obj.s : 6;
    return { team: { name: String(obj.n || "Equipo compartido").slice(0, 40), mons, size }, warnings };
  }
  const toB64Url = (bytes) => {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const fromB64Url = (text) => {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  };
  async function streamBytes(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }
  async function encodeShare(team) {
    if (typeof CompressionStream === "undefined") throw new Error("Tu navegador no permite comprimir el código (CompressionStream).");
    const json = new TextEncoder().encode(JSON.stringify(packTeam(team)));
    return SHARE_PREFIX + toB64Url(await streamBytes(json, new CompressionStream("gzip")));
  }
  async function decodeShare(text) {
    const raw = String(text).trim();
    const at = raw.indexOf(SHARE_PREFIX);
    if (at < 0) throw new Error("No es un código de equipo (DIOSESMON-EQ1).");
    const body = raw.slice(at + SHARE_PREFIX.length).match(/^[A-Za-z0-9_-]+/);
    if (!body) throw new Error("El código está vacío o incompleto.");
    if (typeof DecompressionStream === "undefined") throw new Error("Tu navegador no permite leer el código (DecompressionStream).");
    let json;
    try {
      json = JSON.parse(new TextDecoder().decode(await streamBytes(fromB64Url(body[0]), new DecompressionStream("gzip"))));
    } catch (error) {
      throw new Error("El código está dañado o incompleto. Cópialo entero.");
    }
    return unpackTeam(json);
  }

  window.VComp = {
    D, toID, norm, STAT_KEYS, STAT_SHORT, CATEGORY, ITEM_CATS, TYPE_COLORS,
    species, speciesById, moves, moveById, abilities, abilityById, items, itemById, megaStoneFor, megaFits, battleForm, moveTypeFor, natures, natureById, types,
    learnset, methodLabels, speciesAbilities, blankMon, sanitizeMon, calcStats, evTotal, natureMult,
    eff, effVs, defensiveProfile, offensiveMult, exportShowdown, importShowdown, encodeShare, decodeShare, SHARE_PREFIX,
  };
})();
