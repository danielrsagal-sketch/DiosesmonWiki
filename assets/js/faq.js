// Preguntas frecuentes: acordeón por temas, buscador y enlace directo a cada pregunta (#id).
const FAQ_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";

const normalizeFaq = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const stripTags = (html) => html.replace(/<[^>]*>/g, "");
const MOD_TONES = { ok: "✓", warn: "!", no: "✕" };

// Listas de mods o packs (permitidos, con condiciones, denegados) dentro de una respuesta.
const renderModLists = (lists) => `<div class="faq-mods">${lists.map((list) => `
  <section class="faq-mod-list is-${list.tone}">
    <h3><i aria-hidden="true">${MOD_TONES[list.tone] ?? ""}</i>${list.title} <span>${list.items.length}</span></h3>
    <ul>${list.items.map(([name, url, note]) => `<li><a href="${url}" target="_blank" rel="noreferrer">${name}</a>${note ? `<small>${note}</small>` : ""}</li>`).join("")}</ul>
  </section>`).join("")}</div>`;
const listText = (lists = []) => lists.flatMap((list) => list.items.map(([name, , note]) => `${name} ${note ?? ""}`)).join(" ");

(function renderFaq() {
  const groups = window.DIOSESMON_FAQ ?? [];
  const root = document.getElementById("faq-groups");
  const chips = document.getElementById("faq-topics");
  const search = document.getElementById("faq-search");
  const empty = document.getElementById("faq-empty");
  let topic = "todo";

  chips.innerHTML = [`<button class="guide-chip" type="button" data-topic="todo" aria-pressed="true">Todo</button>`,
    ...groups.map((group) => `<button class="guide-chip" type="button" data-topic="${group.key}" aria-pressed="false" style="--section-color:${group.color}"><img${group.icon.startsWith("pokemon/") ? ' class="is-mon"' : ""} src="${FAQ_SPRITES}/${group.icon}.png" alt="">${group.label}</button>`)].join("");

  root.innerHTML = groups.map((group) => `
    <section class="faq-group" data-group="${group.key}" style="--group-color:${group.color}" aria-labelledby="faq-${group.key}">
      <h2 class="faq-group-title" id="faq-${group.key}"><img${group.icon.startsWith("pokemon/") ? ' class="is-mon"' : ""} src="${FAQ_SPRITES}/${group.icon}.png" alt="">${group.label}</h2>
      <div class="faq-list">${group.questions.map((item) => `
        <details class="faq-item" id="${item.id}" data-text="${normalizeFaq(`${item.q} ${stripTags(item.a)} ${listText(item.lists)}`).replace(/"/g, "")}">
          <summary data-q="${item.q.replace(/"/g, "&quot;")}">${item.q}</summary>
          <div class="faq-answer"><p data-a>${item.a}</p>${item.lists ? renderModLists(item.lists) : ""}${item.video ? `<figure class="faq-video"><video controls preload="none" playsinline poster="${item.video.poster}" src="${item.video.src}"></video><figcaption>${item.video.caption}</figcaption></figure>` : ""}<button class="faq-copy" type="button" data-copy="${item.id}">Copiar enlace</button></div>
        </details>`).join("")}
      </div>
    </section>`).join("");

  const items = [...root.querySelectorAll(".faq-item")];
  const answers = new Map(items.map((item) => [item, item.querySelector("[data-a]").innerHTML]));

  // Resalta el texto buscado solo en la pregunta y en el texto de la respuesta, nunca dentro de etiquetas.
  const highlight = (html, words) => {
    if (!words.length) return html;
    return html.split(/(<[^>]*>)/).map((part) => {
      if (part.startsWith("<")) return part;
      let out = "";
      let index = 0;
      const plain = normalizeFaq(part);
      while (index < part.length) {
        const hit = words.find((word) => plain.startsWith(word, index));
        if (hit) {
          out += `<mark>${part.slice(index, index + hit.length)}</mark>`;
          index += hit.length;
        } else {
          out += part[index];
          index += 1;
        }
      }
      return out;
    }).join("");
  };

  const apply = () => {
    const words = normalizeFaq(search.value).split(/\s+/).filter((word) => word.length > 1);
    let visible = 0;
    root.querySelectorAll(".faq-group").forEach((section) => {
      let groupVisible = 0;
      section.querySelectorAll(".faq-item").forEach((item) => {
        const show = (topic === "todo" || section.dataset.group === topic) && words.every((word) => item.dataset.text.includes(word));
        item.hidden = !show;
        const summary = item.querySelector("summary");
        summary.innerHTML = highlight(summary.dataset.q, words);
        item.querySelector("[data-a]").innerHTML = highlight(answers.get(item), words);
        if (show) groupVisible += 1;
        if (words.length) item.open = show;
      });
      section.hidden = groupVisible === 0;
      visible += groupVisible;
    });
    empty.hidden = visible > 0;
  };

  chips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");
    if (!button) return;
    topic = button.dataset.topic;
    chips.querySelectorAll("[data-topic]").forEach((chip) => chip.setAttribute("aria-pressed", String(chip === button)));
    apply();
  });
  search.addEventListener("input", apply);

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    const url = `${location.origin}${location.pathname}#${button.dataset.copy}`;
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = "¡Copiado!";
    } catch {
      button.textContent = url;
    }
    setTimeout(() => { button.textContent = "Copiar enlace"; }, 1800);
  });
  root.addEventListener("toggle", (event) => {
    const item = event.target;
    if (item.open && !search.value) history.replaceState(null, "", `#${item.id}`);
  }, true);

  const openHash = () => {
    const item = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!item?.classList.contains("faq-item")) return;
    item.open = true;
    item.scrollIntoView({ block: "start" });
  };
  window.addEventListener("hashchange", openHash);
  openHash();
})();
