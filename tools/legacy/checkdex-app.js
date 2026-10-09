const regions = {
  kanto: { name: 'Kanto', number: '01', start: 1, end: 151 },
  johto: { name: 'Johto', number: '02', start: 152, end: 251 },
  hoenn: { name: 'Hoenn', number: '03', start: 252, end: 386 },
  sinnoh: { name: 'Sinnoh', number: '04', start: 387, end: 493 },
  unova: { name: 'Unova', number: '05', start: 494, end: 649 },
  kalos: { name: 'Kalos', number: '06', start: 650, end: 721 },
  alola: { name: 'Alola', number: '07', start: 722, end: 809 },
  galar: { name: 'Galar', number: '08', start: 810, end: 905 },
  paldea: { name: 'Paldea', number: '09', start: 906, end: 1025 }
};

let activeRegion = 'sinnoh';
let activeFilter = 'all';
let pokemonData = [];
let caught = new Set();
const grid = document.querySelector('#pokemon-grid');
const searchInput = document.querySelector('#search-input');

function regionInfo() { return regions[activeRegion]; }
function buildPokemonData() {
  const region = regionInfo();
  return Array.from({ length: region.end - region.start + 1 }, (_, index) => ({
    regionalId: index + 1,
    nationalId: region.start + index,
    name: `Pokémon #${String(region.start + index).padStart(3, '0')}`
  }));
}
function loadCaught() { return new Set(JSON.parse(localStorage.getItem(`checkdex-caught-${activeRegion}`) || '[]')); }
function save() { localStorage.setItem(`checkdex-caught-${activeRegion}`, JSON.stringify([...caught])); }
function spriteUrl(id) { return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`; }
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = pokemonData.filter((pokemon) => {
    const matchesSearch = !query || pokemon.name.toLowerCase().includes(query) || String(pokemon.nationalId).includes(query);
    const matchesFilter = activeFilter === 'all' || (activeFilter === 'caught' && caught.has(pokemon.regionalId)) || (activeFilter === 'pending' && !caught.has(pokemon.regionalId));
    return matchesSearch && matchesFilter;
  });
  grid.innerHTML = visible.map((pokemon) => {
    const isCaught = caught.has(pokemon.regionalId);
    return `<button class="pokemon-card ${isCaught ? 'caught' : ''}" data-id="${pokemon.regionalId}" aria-pressed="${isCaught}" title="Marcar ${pokemon.name}">
      <span class="card-number">#${String(pokemon.nationalId).padStart(3, '0')}</span>
      <span class="card-sprite"><img src="${spriteUrl(pokemon.nationalId)}" alt="${pokemon.name}" loading="lazy"></span>
      <span class="card-name">${pokemon.name}</span>
      <span class="card-status"><i class="pokeball"></i>${isCaught ? 'capturado' : 'pendiente'}</span>
    </button>`;
  }).join('');
  document.querySelector('#empty-state').hidden = visible.length > 0;
  document.querySelector('#visible-count').textContent = `${visible.length} POKÉMON`;
  updateStats();
}
function updateStats() {
  const count = caught.size;
  const total = pokemonData.length;
  const percent = Math.round((count / total) * 100);
  document.querySelector('#caught-count').textContent = count;
  document.querySelector('#remaining-count').textContent = total - count;
  document.querySelector('#progress-percent').textContent = `${percent}%`;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('#all-count').textContent = total;
  document.querySelector('#pending-count').textContent = total - count;
  document.querySelector('#caught-filter-count').textContent = count;
}
function updateRegionUi() {
  const region = regionInfo();
  document.querySelector('#region-eyebrow').textContent = `PC / REGIÓN ${region.number}`;
  document.querySelector('#region-title').innerHTML = `${region.name} <span>${String(region.start).padStart(3, '0')}—${String(region.end).padStart(3, '0')}</span>`;
  document.querySelector('#box-name').textContent = region.name.toUpperCase();
  document.querySelectorAll('.generation-button').forEach((button) => button.classList.toggle('active', button.dataset.region === activeRegion));
}
async function loadNames() {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const names = (await response.json()).results;
    pokemonData = pokemonData.map((pokemon) => ({ ...pokemon, name: names[pokemon.nationalId - 1]?.name.replaceAll('-', ' ') || pokemon.name }));
    render();
  } catch (error) { console.warn('No se pudieron cargar los nombres de PokéAPI.', error); }
}
async function selectRegion(regionKey) {
  activeRegion = regionKey;
  activeFilter = 'all';
  searchInput.value = '';
  pokemonData = buildPokemonData();
  caught = loadCaught();
  updateRegionUi();
  render();
  await loadNames();
}

grid.addEventListener('click', (event) => {
  const card = event.target.closest('.pokemon-card');
  if (!card) return;
  const id = Number(card.dataset.id);
  caught.has(id) ? caught.delete(id) : caught.add(id);
  save();
  render();
});
document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
  render();
}));
document.querySelectorAll('.generation-button').forEach((button) => button.addEventListener('click', () => selectRegion(button.dataset.region)));
searchInput.addEventListener('input', render);
document.querySelector('#reset-button').addEventListener('click', () => {
  if (caught.size && confirm(`¿Quieres borrar todo tu progreso de ${regionInfo().name}?`)) { caught.clear(); save(); render(); }
});

pokemonData = buildPokemonData();
caught = loadCaught();
updateRegionUi();
render();
loadNames();
