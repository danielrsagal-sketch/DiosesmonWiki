// Sonidos de la wiki al estilo de los menús de Pokémon (sintetizados, sin archivos) y gritos de los Pokémon.
// Se cargan desde site-nav.js en todas las páginas. El botón del altavoz de la barra abre el volumen (se recuerda).
//   Para que un elemento no suene: data-sfx="none". Para forzar un sonido: data-sfx="a" | "back" | "on" | "off" | "catch".
(function diosesSfx() {
  const KEY = "wiki-diosesmon-sonido";
  const TIP_KEY = "wiki-diosesmon-sonido-aviso";
  const MAX_GAIN = 0.6;
  const CRY_URL = (id) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
  const SPEAKER = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/293.png";

  // Ajustes guardados: volumen de 0 a 100 y si está silenciado.
  let volume = 50;
  let muted = false;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "off") muted = true;
    else if (saved?.startsWith("{")) ({ volume = 50, muted = false } = JSON.parse(saved));
  } catch { /* sin almacenamiento: valores por defecto */ }
  const silent = () => muted || volume === 0;
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ volume, muted })); } catch { /* nada */ }
  };

  let ctx = null;
  let master = null;
  const audio = () => {
    if (!ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      ctx = new Context();
      master = ctx.createGain();
      master.gain.value = (volume / 100) * MAX_GAIN;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  // Cada sonido es una lista de notas [frecuencia, duración en segundos], tocadas seguidas con onda cuadrada (como la Game Boy).
  const SOUNDS = {
    a: [[1319, 0.028], [1976, 0.05]],
    back: [[988, 0.03], [659, 0.06]],
    on: [[1047, 0.035], [1319, 0.035], [1568, 0.07]],
    off: [[1568, 0.035], [1047, 0.07]],
    catch: [[1047, 0.06], [1319, 0.06], [1568, 0.06], [2093, 0.16]],
    open: [[784, 0.03], [1175, 0.03], [1568, 0.06]],
  };

  const play = (name) => {
    if (silent() || !SOUNDS[name]) return;
    const context = audio();
    if (!context) return;
    let time = context.currentTime + 0.005;
    SOUNDS[name].forEach(([frequency, duration]) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.5, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + duration + 0.01);
      time += duration;
    });
  };

  // Nota suelta programada en el tiempo del audio (para música y fanfarrias).
  const note = (context, output, frequency, time, duration, { type = "square", level = 0.35 } = {}) => {
    if (!frequency) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.95);
    osc.connect(gain).connect(output);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  };

  // Fanfarrias de la ruleta de Tesoros: cada nota es [frecuencia (0 = silencio), duración en pulsos].
  const JINGLES = {
    tick: { beat: 0.03, lead: [[1760, 1]], level: 0.18 },
    win: { beat: 0.09, lead: [[784, 1], [988, 1], [1175, 1], [1568, 3]], bass: [[196, 3], [294, 3]] },
    rare: {
      beat: 0.1,
      lead: [[1047, 1], [1047, 1], [1047, 1], [1047, 3], [831, 3], [932, 3], [1047, 2], [932, 1], [1047, 6]],
      bass: [[262, 3], [0, 3], [208, 3], [233, 3], [262, 9]],
    },
  };
  const jingle = (name) => {
    const song = JINGLES[name];
    if (silent() || !song) return;
    const context = audio();
    if (!context) return;
    const start = context.currentTime + 0.01;
    [["lead", "square", song.level ?? 0.32], ["bass", "triangle", 0.45]].forEach(([part, type, level]) => {
      let time = start;
      (song[part] ?? []).forEach(([frequency, beats]) => {
        note(context, master, frequency, time, beats * song.beat, { type, level });
        time += beats * song.beat;
      });
    });
  };

  // Música en bucle mientras gira la ruleta (estilo Game Boy). Devuelve una función para pararla con un fundido.
  const SPIN_LEAD = [659, 784, 988, 784, 659, 784, 988, 1175, 698, 880, 1047, 880, 698, 880, 1047, 1319];
  const SPIN_BASS = [165, 0, 165, 0, 175, 0, 175, 0];
  const music = () => {
    if (silent()) return () => {};
    const context = audio();
    if (!context) return () => {};
    const bus = context.createGain();
    bus.gain.value = 0.55;
    bus.connect(master);
    const step = 0.11;
    let next = context.currentTime + 0.05;
    let index = 0;
    const schedule = () => {
      while (next < context.currentTime + 0.4) {
        note(context, bus, SPIN_LEAD[index % SPIN_LEAD.length], next, step * 0.9, { level: 0.22 });
        if (index % 2 === 0) note(context, bus, SPIN_BASS[(index / 2) % SPIN_BASS.length], next, step * 1.8, { type: "triangle", level: 0.4 });
        next += step;
        index += 1;
      }
    };
    schedule();
    const timer = setInterval(schedule, 150);
    return () => {
      clearInterval(timer);
      const now = context.currentTime;
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      setTimeout(() => bus.disconnect(), 500);
    };
  };

  let currentCry = null;
  const cry = (id) => {
    const number = parseInt(id, 10);
    if (silent() || !number) return;
    currentCry?.pause();
    currentCry = new Audio(CRY_URL(number));
    currentCry.volume = Math.min(1, (volume / 100) * 0.7);
    currentCry.play().catch(() => {});
  };

  const soundFor = (element) => {
    const forced = element.closest("[data-sfx]")?.dataset.sfx;
    if (forced) return forced === "none" ? null : forced;
    if (element.matches("input[type=checkbox], input[type=radio]")) return element.checked ? "on" : "off";
    if (element.matches("input, select, textarea")) return null;
    if (element.matches("[data-close], [aria-label='Cerrar'], [class*='close']")) return "back";
    if (element.matches("summary")) return element.parentElement?.open ? "back" : "open";
    return "a";
  };

  document.addEventListener("click", (event) => {
    const element = event.target.closest("a[href], button, summary, label, [role='button'], input[type=checkbox], input[type=radio], [data-sfx]");
    if (!element || element.closest(".sfx-mute, .sfx-range")) return;
    // Un clic en una etiqueta <label> llega también a su casilla: suena solo una vez.
    if (element.matches("label") && element.control) return;
    const name = soundFor(element);
    if (name) play(name);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector("dialog[open], .is-open, [aria-modal='true']:not([hidden]), .sfx-panel:not([hidden])")) play("back");
  }, true);

  // Botón del altavoz en la barra superior: abre un panel con el volumen, y la primera vez un Pokémon te avisa.
  const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/></svg>';
  const ICON_LOW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9.5a3.5 3.5 0 0 1 0 5"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m16.5 9.5 5 5m0-5-5 5"/></svg>';
  const header = document.querySelector(".dex-header-inner");
  if (header) {
    const wrap = document.createElement("div");
    wrap.className = "sfx";
    wrap.innerHTML = `
      <button class="sfx-toggle" type="button" aria-expanded="false" aria-controls="sfx-panel"></button>
      <div class="sfx-panel" id="sfx-panel" role="dialog" aria-label="Volumen de la wiki" hidden>
        <div class="sfx-talk"><img src="${SPEAKER}" alt="" width="64" height="64"><p data-sfx-say></p></div>
        <div class="sfx-row">
          <button class="sfx-mute" type="button"></button>
          <input class="sfx-range" type="range" min="0" max="100" step="5" aria-label="Volumen">
          <output class="sfx-value"></output>
        </div>
      </div>
      <div class="sfx-tip" role="status" hidden><img src="${SPEAKER}" alt="" width="52" height="52"><p>¡Ey, entrenador! ¿Te molesta el ruido? <b>¡Baja o sube el volumen aquí!</b></p><button type="button" aria-label="Cerrar aviso" data-sfx="back">×</button></div>`;
    header.insertBefore(wrap, header.querySelector(".feedback-cta"));
    const toggle = wrap.querySelector(".sfx-toggle");
    const panel = wrap.querySelector(".sfx-panel");
    const say = wrap.querySelector("[data-sfx-say]");
    const range = wrap.querySelector(".sfx-range");
    const value = wrap.querySelector(".sfx-value");
    const mute = wrap.querySelector(".sfx-mute");
    const tip = wrap.querySelector(".sfx-tip");

    // Lo que dice el Pokémon según el volumen.
    const phrase = () => {
      if (silent()) return "Shhh… estoy en silencio. <b>¡Sube el volumen</b> si quieres oírme!";
      if (volume <= 25) return "Te oigo bajito… <b>¡Baja o sube el volumen!</b>";
      if (volume >= 85) return "¡¡ASÍ SE OYE BIEN!! <b>¡Baja o sube el volumen!</b>";
      return "¡Hola, entrenador! <b>¡Baja o sube el volumen!</b>";
    };
    const draw = () => {
      toggle.innerHTML = silent() ? ICON_OFF : volume <= 40 ? ICON_LOW : ICON_ON;
      toggle.classList.toggle("is-muted", silent());
      toggle.setAttribute("aria-label", `Volumen de la wiki: ${silent() ? "silenciado" : `${volume} %`}`);
      toggle.title = silent() ? "Sonidos desactivados" : `Volumen: ${volume} %`;
      const shown = muted ? 0 : volume;
      range.value = String(shown);
      range.style.setProperty("--fill", `${shown}%`);
      value.textContent = String(shown);
      mute.textContent = silent() ? "Activar" : "Silenciar";
      mute.setAttribute("aria-pressed", String(silent()));
      say.innerHTML = phrase();
      if (master) master.gain.value = (volume / 100) * MAX_GAIN;
    };
    const hideTip = () => {
      tip.hidden = true;
      try { localStorage.setItem(TIP_KEY, "1"); } catch { /* nada */ }
    };
    const setOpen = (open) => {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) hideTip();
    };

    toggle.addEventListener("click", () => setOpen(panel.hidden));
    range.addEventListener("input", () => {
      volume = Number(range.value);
      muted = false;
      draw();
    });
    range.addEventListener("change", () => {
      save();
      play("a");
    });
    mute.addEventListener("click", () => {
      if (silent()) {
        muted = false;
        if (volume === 0) volume = 50;
      } else muted = true;
      save();
      draw();
      play("on");
    });
    tip.querySelector("button").addEventListener("click", (event) => {
      event.stopPropagation();
      hideTip();
    });
    tip.addEventListener("click", () => {
      hideTip();
      setOpen(true);
    });
    document.addEventListener("click", (event) => { if (!wrap.contains(event.target)) setOpen(false); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    draw();

    // El aviso sale una sola vez, a los pocos segundos de entrar, y se va solo.
    let seen = false;
    try { seen = localStorage.getItem(TIP_KEY) === "1"; } catch { seen = true; }
    if (!seen) {
      setTimeout(() => { if (panel.hidden) tip.hidden = false; }, 2500);
      setTimeout(() => { if (!tip.hidden) hideTip(); }, 12000);
    }
  }

  window.DiosesSfx = { play, cry, jingle, music, isMuted: silent };
})();
