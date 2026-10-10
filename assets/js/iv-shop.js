// Tienda de IVs del servidor (NPC): sube o baja IVs y cobra por punto según el valor al que llega.
// Se usa en Entrenamiento EV y en Crianza: renderIvShop(contenedor, { preset }).
const IV_SHOP_BANDS = [
  { max: 10, price: 1500 },
  { max: 15, price: 3000 },
  { max: 20, price: 6000 },
  { max: 25, price: 10000 },
  { max: 28, price: 20000 },
  { max: 31, price: 50000 },
];
const IV_SHOP_STATS = ["PS", "Ataque", "Defensa", "At. Esp.", "Def. Esp.", "Velocidad"];

// Precio de un punto según el valor en el que queda el IV.
const ivShopPointPrice = (value) => IV_SHOP_BANDS.find((band) => value <= band.max).price;

// Coste de llevar un IV de «from» a «to» (subiendo o bajando).
function ivShopCost(from, to) {
  let total = 0;
  if (to > from) for (let value = from + 1; value <= to; value += 1) total += ivShopPointPrice(value);
  else for (let value = from - 1; value >= to; value -= 1) total += ivShopPointPrice(value);
  return total;
}

// Miles con punto también en cifras de 4 dígitos (1.500), como en el juego.
const ivShopMoney = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function renderIvShop(container, { title = "Calculadora de la Tienda de IVs" } = {}) {
  const presets = [
    { label: "Todo a 31", target: [31, 31, 31, 31, 31, 31] },
    { label: "Físico (AtE 0)", target: [31, 31, 31, 0, 31, 31] },
    { label: "Especial (Atq 0)", target: [31, 0, 31, 31, 31, 31] },
    { label: "Espacio Raro (Vel 0)", target: [null, null, null, null, null, 0] },
  ];
  container.innerHTML = `
    <h3>${title}</h3>
    <p class="iv-shop-help">Pon los IVs que tiene tu Pokémon y los que quieres. Se cobra cada punto según el valor al que llega, también al bajar.</p>
    <div class="iv-shop-presets">${presets.map((preset, index) => `<button class="guide-chip" type="button" data-preset="${index}">${preset.label}</button>`).join("")}</div>
    <div class="iv-shop-grid" role="table" aria-label="IVs actuales y objetivo">
      <div class="iv-shop-row is-head" role="row"><span role="columnheader">Stat</span><span role="columnheader">Actual</span><span role="columnheader">Objetivo</span><span role="columnheader">Coste</span></div>
      ${IV_SHOP_STATS.map((stat, index) => `
        <div class="iv-shop-row" role="row">
          <span role="cell">${stat}</span>
          <input role="cell" type="number" min="0" max="31" value="0" inputmode="numeric" data-iv-from="${index}" aria-label="${stat} actual">
          <input role="cell" type="number" min="0" max="31" value="0" inputmode="numeric" data-iv-to="${index}" aria-label="${stat} objetivo">
          <em role="cell" data-iv-cost="${index}">0</em>
        </div>`).join("")}
    </div>
    <div class="iv-shop-total" aria-live="polite"></div>`;
  const clamp = (input) => Math.min(31, Math.max(0, Number.parseInt(input.value, 10) || 0));
  const update = () => {
    let total = 0;
    let points = 0;
    IV_SHOP_STATS.forEach((_, index) => {
      const from = clamp(container.querySelector(`[data-iv-from="${index}"]`));
      const to = clamp(container.querySelector(`[data-iv-to="${index}"]`));
      const cost = ivShopCost(from, to);
      total += cost;
      points += Math.abs(to - from);
      container.querySelector(`[data-iv-cost="${index}"]`).textContent = cost ? `$${ivShopMoney(cost)}` : "—";
    });
    container.querySelector(".iv-shop-total").innerHTML = `<span>Comprar <strong>${points}</strong> punto(s)</span><strong class="iv-shop-price">$${ivShopMoney(total)}</strong>`;
  };
  container.addEventListener("input", update);
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (!button) return;
    presets[button.dataset.preset].target.forEach((value, index) => {
      const field = container.querySelector(`[data-iv-to="${index}"]`);
      field.value = value ?? container.querySelector(`[data-iv-from="${index}"]`).value;
    });
    update();
  });
  update();
}
