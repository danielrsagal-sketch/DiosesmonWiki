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
const mapElement = document.querySelector("#sf-map");
const scalePins = () => {
  mapElement.style.setProperty("--pin-scale", Math.min(1, Math.max(0.5, 0.5 + (map.getZoom() - 1) * 0.25)).toFixed(2));
  // De cerca las etiquetas de zona se atenúan para no tapar el mapa.
  mapElement.classList.toggle("is-close", map.getZoom() >= 3);
};
map.on("zoom", scalePins);
scalePins();

// ---- Zonas ----
// Las etiquetas van en su propia capa, por debajo de los marcadores.
map.createPane("zones").style.zIndex = 450;
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
      ${point.description ? `<p>${escapeHtml(point.description)}</p>` : ""}
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

// Puntos agrupados por tipo: muchos comparten nombre, así que cada uno muestra sus coordenadas.
document.querySelector("#sf-points").innerHTML = markers.length
  ? Object.entries(SAFARI.categories).map(([type, category]) => {
    const items = markers.map((entry, index) => ({ ...entry, index })).filter(({ point }) => point.type === type);
    if (!items.length) return "";
    return `<details class="sf-point-group" style="--pin-color:${category.color}"${items.length <= 3 ? " open" : ""}>
        <summary><img src="${iconUrl(category.icon)}" alt="">${escapeHtml(category.label)}<small>${items.length}</small></summary>
        <div class="sf-point-items">${items.map(({ point, index }) => `<button type="button" class="sf-point-btn" data-point="${index}" style="--pin-color:${category.color}">
            <span><strong>${escapeHtml(point.name)}</strong><small>X ${point.x} · Z ${point.z}</small></span>
          </button>`).join("")}</div>
      </details>`;
  }).join("")
  : '<p class="sf-empty">Aún no hay puntos.</p>';
document.querySelector("#sf-points").addEventListener("click", (event) => {
  const entry = markers[Number(event.target.closest("[data-point]")?.dataset.point)];
  if (!entry) return;
  map.flyTo(entry.marker.getLatLng(), 4, { duration: 0.8 });
  map.once("moveend", () => entry.marker.openPopup());
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
