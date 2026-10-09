// Iconos de recompensas compartidos (DexRewards, Gimnasios…), según el texto de cada recompensa.
const REWARD_ITEM_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";
// Tipo de cada movimiento que se entrega como MT/DT: decide el color del disco.
const REWARD_MOVE_TYPES = {
  "cola férrea": "steel", "foco resplandor": "steel", "represión metal": "steel",
  "respiro": "flying", "aire afilado": "flying",
  "tijera x": "bug",
  "gigaimpacto": "normal", "giga impacto": "normal",
  "bola sombra": "ghost", "golpe fantasma": "ghost",
  "puño drenaje": "fighting", "puño incremento": "fighting", "romperrocas": "fighting",
  "rayo hielo": "ice", "martillo hielo": "ice",
  "garra dragón": "dragon",
  "avalancha": "rock",
  "trueno": "electric", "voltio cruel": "electric",
  "llamarada": "fire",
  "psíquico": "psychic",
  "hidrobomba": "water", "surf": "water", "cascada": "water",
  "energibola": "grass",
  "terremoto": "ground",
};

function rewardIcon(reward) {
  const text = String(reward).toLocaleLowerCase("es");
  // PokéDólares siempre con el Cupón 1 (parece un billete).
  if (text.includes("pokédólar") || text.includes("pokedolar")) return `${REWARD_ITEM_SPRITES}/coupon-1.png`;
  if (text.includes("dcoin")) return `${REWARD_ITEM_SPRITES}/nugget.png`;
  if (text.includes("caramelo")) return `${REWARD_ITEM_SPRITES}/rare-candy.png`;
  if (text.includes("megapulsera")) return `${REWARD_ITEM_SPRITES}/mega-bracelet.png`;
  if (text.includes("repartir exp")) return `${REWARD_ITEM_SPRITES}/exp-share.png`;
  if (/^(mt|dt)\b/.test(text) || /\b(mt|dt)\b/.test(text)) {
    const move = text.replace(/^.*?\b(mt|dt)\b:?\s*/, "").trim();
    return `${REWARD_ITEM_SPRITES}/tm-${REWARD_MOVE_TYPES[move] ?? "normal"}.png`;
  }
  return `${REWARD_ITEM_SPRITES}/poke-ball.png`;
}

function rewardChips(rewards, className = "reward-chips") {
  return `<ul class="${className}">${rewards.map((reward) => `<li><img src="${rewardIcon(reward)}" alt="" width="30" height="30">${String(reward).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character])}</li>`).join("")}</ul>`;
}
