// Guía para empezar: lista de primeros pasos con progreso guardado en el navegador.
const START_KEY = "wiki-diosesmon-guia-v1";

(function startChecklist() {
  const items = [...document.querySelectorAll("[data-start]")];
  const bar = document.getElementById("start-bar");
  const label = document.getElementById("start-count");
  let done = new Set();
  try {
    done = new Set(JSON.parse(localStorage.getItem(START_KEY) ?? "[]"));
  } catch { /* sin almacenamiento: la lista funciona igual, sin recordar */ }

  const save = () => {
    try { localStorage.setItem(START_KEY, JSON.stringify([...done])); } catch { /* nada */ }
  };
  const draw = () => {
    items.forEach((item) => {
      const checked = done.has(item.dataset.start);
      item.querySelector("input").checked = checked;
      item.classList.toggle("is-done", checked);
    });
    const total = items.filter((item) => done.has(item.dataset.start)).length;
    bar.style.width = `${(total / items.length) * 100}%`;
    label.textContent = `${total} / ${items.length}`;
  };

  items.forEach((item) => {
    item.querySelector("input").addEventListener("change", (event) => {
      if (event.target.checked) done.add(item.dataset.start);
      else done.delete(item.dataset.start);
      save();
      draw();
    });
  });
  document.getElementById("start-reset").addEventListener("click", () => {
    done.clear();
    save();
    draw();
  });
  draw();
})();

(function copyIp() {
  document.querySelectorAll("[data-copy-ip]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("mc.diosesmon.net");
        button.textContent = "¡Copiada!";
      } catch {
        button.textContent = "mc.diosesmon.net";
      }
      setTimeout(() => { button.textContent = "Copiar IP"; }, 1800);
    });
  });
})();
