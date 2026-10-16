// Zona Safari: mapa con zoom (Leaflet) en coordenadas de Minecraft.
// Las teselas salen de tools/build_safari_tiles.py: zoom 4 = 1 bloque por píxel, el mapa cubre X/Z de -2048 a 2048.
const SAFARI = window.SAFARI_MAP ?? { categories: {}, zones: [], waypoints: [] };
const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";
const HALF = 2048;
const NATIVE_ZOOM = 4;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function iconUrl(icon) {
  if (/^https?:/.test(icon) || icon.startsWith("assets/")) return icon;
  return `${SPRITES}/${icon}.png`;
}

// latlng = [z, x] en bloques: en zoom 4 cada bloque es 1 píxel y el (0, 0) queda en el centro de la imagen.
const MinecraftCRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1 / 2 ** NATIVE_ZOOM, HALF / 2 ** NATIVE_ZOOM, 1 / 2 ** NATIVE_ZOOM, HALF / 2 ** NATIVE_ZOOM),
});
const toLatLng = ({ x, z }) => L.latLng(z, x);
const bounds = L.latLngBounds([-HALF, -HALF], [HALF, HALF]);

const map = L.map("sf-map", {
  crs: MinecraftCRS,
  minZoom: 0,
  maxZoom: 6,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 90,
  maxBounds: bounds.pad(0.1),
  maxBoundsViscosity: 0.8,
  attributionControl: false,
});
L.tileLayer("assets/img/safari/{z}/{x}_{y}.webp", {
  tileSize: 256,
  minZoom: 0,
  maxZoom: 6,
  maxNativeZoom: NATIVE_ZOOM,
  noWrap: true,
  bounds,
  errorTileUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
}).addTo(map);
map.fitBounds(L.latLngBounds([-1600, -1600], [1600, 1600]));
// Las etiquetas de zona van en su propia capa (su altura respecto a los pines depende del zoom).
map.createPane("zones");
const mapElement = document.querySelector("#sf-map");
const scalePins = () => {
  mapElement.style.setProperty("--pin-scale", Math.min(1, Math.max(0.5, 0.5 + (map.getZoom() - 1) * 0.25)).toFixed(2));
  // De cerca las etiquetas de zona se atenúan para no tapar el mapa.
  const close = map.getZoom() >= 3;
  mapElement.classList.toggle("is-close", close);
  // De lejos las etiquetas van encima de los pines (para leer las zonas); de cerca, debajo.
  map.getPane("zones").style.zIndex = close ? 450 : 650;
};
map.on("zoom", scalePins);
scalePins();

// ---- Zonas ----
const zoneLayer = L.layerGroup().addTo(map);
for (const zone of SAFARI.zones) {
  L.marker(toLatLng(zone), {
    pane: "zones",
    interactive: false,
    keyboard: false,
    icon: L.divIcon({ className: "sf-zone-label", html: `<span style="--zone-color:${zone.color}">${escapeHtml(zone.name)}</span>`, iconSize: null }),
  }).addTo(zoneLayer);
}

// ---- Puntos ----
const groups = {};
const markers = [];
for (const [type, category] of Object.entries(SAFARI.categories)) groups[type] = L.layerGroup().addTo(map);

function pinIcon(category, type) {
  return L.divIcon({
    className: `sf-pin is-${type}`,
    html: `<span class="sf-pin-body" style="--pin-color:${category.color}"><img src="${iconUrl(category.icon)}" alt=""></span>`,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -46],
  });
}

for (const point of SAFARI.waypoints) {
  const category = SAFARI.categories[point.type];
  if (!category) continue;
  const marker = L.marker(toLatLng(point), { icon: pinIcon(category, point.type), title: point.name, riseOnHover: true });
  marker.bindPopup(`<div class="sf-popup">
      <span class="sf-popup-type" style="--pin-color:${category.color}">${escapeHtml(category.label)}</span>
      <strong>${escapeHtml(point.name)}</strong>
      ${point.description ?? category.description ? `<p>${escapeHtml(point.description ?? category.description)}</p>` : ""}
      <code>X ${point.x}${point.y !== undefined ? ` · Y ${point.y}` : ""} · Z ${point.z}</code>
    </div>`);
  marker.addTo(groups[point.type]);
  markers.push({ point, marker });
}

// ---- Panel lateral ----
const legend = document.querySelector("#sf-legend");
legend.innerHTML = Object.entries(SAFARI.categories).map(([type, category]) => {
  const count = SAFARI.waypoints.filter((point) => point.type === type).length;
  return `<label class="sf-legend-item" style="--pin-color:${category.color}">
      <input type="checkbox" data-category="${type}" checked>
      <img src="${iconUrl(category.icon)}" alt="">
      <span>${escapeHtml(category.label)}</span>
      <small>${count || "Próximamente"}</small>
    </label>`;
}).join("");
legend.addEventListener("change", (event) => {
  const input = event.target.closest("[data-category]");
  if (!input) return;
  if (input.checked) groups[input.dataset.category].addTo(map);
  else groups[input.dataset.category].remove();
});

document.querySelector("#sf-zones").innerHTML = SAFARI.zones.map((zone) => `<button type="button" class="sf-zone-btn" data-zone="${zone.id}" style="--zone-color:${zone.color}">${escapeHtml(zone.name)}</button>`).join("");
document.querySelector("#sf-zones").addEventListener("click", (event) => {
  const zone = SAFARI.zones.find((item) => item.id === event.target.closest("[data-zone]")?.dataset.zone);
  if (zone) map.flyTo(toLatLng(zone), 3, { duration: 0.8 });
});

// Puntos agrupados por tipo y, dentro, por zona; ordenados del más cercano al centro (0, 0) al más lejano.
const distance = (point) => Math.round(Math.hypot(point.x, point.z));
const zoneOf = Object.fromEntries(SAFARI.zones.map((zone) => [zone.id, zone]));
const pointButton = ({ point, index }, color) => `<button type="button" class="sf-point-btn" data-point="${index}" style="--pin-color:${color}">
    <span><strong>${escapeHtml(point.name)}</strong><small>X ${point.x} · Z ${point.z} · a ${distance(point)} bloques</small></span>
  </button>`;
document.querySelector("#sf-points").innerHTML = markers.length
  ? Object.entries(SAFARI.categories).map(([type, category]) => {
    const items = markers.map((entry, index) => ({ ...entry, index })).filter(({ point }) => point.type === type)
      .sort((a, b) => distance(a.point) - distance(b.point));
    if (!items.length) return "";
    const zoned = SAFARI.zones.map((zone) => ({ zone, list: items.filter(({ point }) => point.zone === zone.id) })).filter(({ list }) => list.length);
    const loose = items.filter(({ point }) => !zoneOf[point.zone]);
    const body = zoned.length
      ? zoned.map(({ zone, list }) => `<div class="sf-zone-group" style="--zone-color:${zone.color}">
          <p class="sf-zone-title">${escapeHtml(zone.name)}<small>${list.length}</small></p>
          ${list.map((item) => pointButton(item, category.color)).join("")}
        </div>`).join("") + loose.map((item) => pointButton(item, category.color)).join("")
      : items.map((item) => pointButton(item, category.color)).join("");
    return `<details class="sf-point-group" style="--pin-color:${category.color}"${items.length <= 3 ? " open" : ""}>
        <summary><img src="${iconUrl(category.icon)}" alt="">${escapeHtml(category.label)}<small>${items.length}</small></summary>
        <div class="sf-point-items">${body}</div>
      </details>`;
  }).join("")
  : '<p class="sf-empty">Aún no hay puntos.</p>';
document.querySelector("#sf-points").addEventListener("click", (event) => {
  const entry = markers[Number(event.target.closest("[data-point]")?.dataset.point)];
  if (!entry) return;
  map.flyTo(entry.marker.getLatLng(), 4, { duration: 0.8 });
  map.once("moveend", () => entry.marker.openPopup());
});

// ---- Descarga en formato de Xaero's Minimap ----
// waypoint:nombre:inicial:x:y:z:color:disabled:type:set:rotate_on_tp:tp_yaw:visibility_type:destination
const XAERO = {
  pokeparada: { name: "Pokeparada", initial: "P", color: 11 },
  taxi: { name: "Taxi", initial: "T", color: 6 },
  entrenador: { name: "Entrenador", initial: "E", color: 13 },
  spawn: { name: "Spawn Safari", initial: "S", color: 14 },
};
const plain = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "");
function xaeroText(types) {
  const lines = ["#", "#waypoint:name:initials:x:y:z:color:disabled:type:set:rotate_on_tp:tp_yaw:visibility_type:destination", "#"];
  for (const type of types) {
    const style = XAERO[type];
    if (!style) continue;
    const counters = {};
    SAFARI.waypoints.filter((point) => point.type === type)
      .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
      .forEach((point) => {
        const zone = SAFARI.zones.find((entry) => entry.id === point.zone);
        const zoneName = { selva: "Selva", articos: "Articos", cumbres: "Cumbres", valle: "Valle", jardin: "Jardin", igneas: "Igneas" }[point.zone] ?? (zone ? plain(zone.name) : "");
        counters[zoneName] = (counters[zoneName] ?? 0) + 1;
        const name = type === "spawn" ? style.name : `${style.name} ${zoneName} ${counters[zoneName]}`.replace(/\s+/g, " ").trim();
        lines.push(`waypoint:${name}:${style.initial}:${point.x}:${point.y ?? 70}:${point.z}:${style.color}:false:0:gui.xaero_default:false:0:0:false`);
      });
  }
  return `${lines.join("\n")}\n`;
}
document.querySelector(".sf-download")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-download]");
  if (!button) return;
  const types = button.dataset.download === "all" ? ["spawn", "taxi", "pokeparada", "entrenador"] : [button.dataset.download];
  const blob = new Blob([xaeroText(types)], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = button.dataset.download === "all" ? "safari-diosesmon-todos.txt" : "safari-diosesmon-pokeparadas.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// ---- Coordenadas ----
const coords = document.querySelector("#sf-coords");
const blockAt = (latlng) => ({ x: Math.floor(latlng.lng), z: Math.floor(latlng.lat) });
map.on("mousemove", (event) => {
  const { x, z } = blockAt(event.latlng);
  coords.textContent = `X ${x} · Z ${z}`;
});
map.on("mouseout", () => { coords.textContent = "X — · Z —"; });
map.on("click", (event) => {
  const { x, z } = blockAt(event.latlng);
  const text = `${x} ${z}`;
  L.popup({ className: "sf-click-popup" })
    .setLatLng(event.latlng)
    .setContent(`<div class="sf-popup"><strong>X ${x} · Z ${z}</strong><button type="button" class="sf-copy" data-copy="${text}">Copiar coordenadas</button></div>`)
    .openOn(map);
});
document.querySelector("#sf-map").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "¡Copiadas!";
  } catch {
    button.textContent = button.dataset.copy;
  }
});

// ---- Pantalla completa ----
const wrap = document.querySelector(".sf-map-wrap");
document.querySelector("#sf-fullscreen").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen?.();
});
document.addEventListener("fullscreenchange", () => {
  wrap.classList.toggle("is-fullscreen", document.fullscreenElement === wrap);
  setTimeout(() => map.invalidateSize(), 100);
});
