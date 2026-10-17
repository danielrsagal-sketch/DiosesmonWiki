"""Genera data/competitivo-data.js para la página Competitivo de la DiosesmonWiki.

Fuentes (solo lectura), en el repo hermano fusionwiki:
  data/pokemon-data.js       especies (stats, tipos, habilidades, disponibilidad en Diosesmon)
  data/pokemon-details.js    learnsets de Cobblemon 1.7.3 (sin Legacy) y formas regionales
  tools/build-cache/         CSV de PokéAPI (movimientos, habilidades, nombres) y es_es de Cobblemon

Uso:  python -I tools/build_competitivo_data.py [ruta-a-fusionwiki]
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUSION = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "fusionwiki"
CACHE = FUSION / "tools" / "build-cache"
OUT = ROOT / "data" / "competitivo-data.js"
ES, EN = "7", "9"

# Orden de tipos de PokéAPI (type_id 1..18).
TYPES = [
    ("Normal", "Normal"), ("Lucha", "Fighting"), ("Volador", "Flying"), ("Veneno", "Poison"), ("Tierra", "Ground"),
    ("Roca", "Rock"), ("Bicho", "Bug"), ("Fantasma", "Ghost"), ("Acero", "Steel"), ("Fuego", "Fire"), ("Agua", "Water"),
    ("Planta", "Grass"), ("Eléctrico", "Electric"), ("Psíquico", "Psychic"), ("Hielo", "Ice"), ("Dragón", "Dragon"),
    ("Siniestro", "Dark"), ("Hada", "Fairy"),
]
TYPE_INDEX = {es: i for i, (es, _) in enumerate(TYPES)}

# Tabla de tipos actual (la que usa Cobblemon a través de Showdown). atacante -> {defensor: multiplicador}
CHART = {
    "Normal": {"Roca": .5, "Acero": .5, "Fantasma": 0},
    "Lucha": {"Normal": 2, "Hielo": 2, "Roca": 2, "Siniestro": 2, "Acero": 2, "Veneno": .5, "Volador": .5,
              "Psíquico": .5, "Bicho": .5, "Hada": .5, "Fantasma": 0},
    "Volador": {"Planta": 2, "Lucha": 2, "Bicho": 2, "Eléctrico": .5, "Roca": .5, "Acero": .5},
    "Veneno": {"Planta": 2, "Hada": 2, "Veneno": .5, "Tierra": .5, "Roca": .5, "Fantasma": .5, "Acero": 0},
    "Tierra": {"Fuego": 2, "Eléctrico": 2, "Veneno": 2, "Roca": 2, "Acero": 2, "Planta": .5, "Bicho": .5, "Volador": 0},
    "Roca": {"Fuego": 2, "Hielo": 2, "Volador": 2, "Bicho": 2, "Lucha": .5, "Tierra": .5, "Acero": .5},
    "Bicho": {"Planta": 2, "Psíquico": 2, "Siniestro": 2, "Fuego": .5, "Lucha": .5, "Veneno": .5, "Volador": .5,
              "Fantasma": .5, "Acero": .5, "Hada": .5},
    "Fantasma": {"Psíquico": 2, "Fantasma": 2, "Siniestro": .5, "Normal": 0},
    "Acero": {"Hielo": 2, "Roca": 2, "Hada": 2, "Fuego": .5, "Agua": .5, "Eléctrico": .5, "Acero": .5},
    "Fuego": {"Planta": 2, "Hielo": 2, "Bicho": 2, "Acero": 2, "Fuego": .5, "Agua": .5, "Roca": .5, "Dragón": .5},
    "Agua": {"Fuego": 2, "Tierra": 2, "Roca": 2, "Agua": .5, "Planta": .5, "Dragón": .5},
    "Planta": {"Agua": 2, "Tierra": 2, "Roca": 2, "Fuego": .5, "Planta": .5, "Veneno": .5, "Volador": .5, "Bicho": .5,
               "Dragón": .5, "Acero": .5},
    "Eléctrico": {"Agua": 2, "Volador": 2, "Eléctrico": .5, "Planta": .5, "Dragón": .5, "Tierra": 0},
    "Psíquico": {"Lucha": 2, "Veneno": 2, "Psíquico": .5, "Acero": .5, "Siniestro": 0},
    "Hielo": {"Planta": 2, "Tierra": 2, "Volador": 2, "Dragón": 2, "Fuego": .5, "Agua": .5, "Hielo": .5, "Acero": .5},
    "Dragón": {"Dragón": 2, "Acero": .5, "Hada": 0},
    "Siniestro": {"Psíquico": 2, "Fantasma": 2, "Lucha": .5, "Siniestro": .5, "Hada": .5},
    "Hada": {"Lucha": 2, "Dragón": 2, "Siniestro": 2, "Fuego": .5, "Veneno": .5, "Acero": .5},
}
EFF_CODE = {0: "0", .5: "1", 1: "2", 2: "3"}

# 25 naturalezas: inglés, índice de stat que sube y que baja (1 Atq, 2 Def, 3 AtE, 4 DfE, 5 Vel; 0 = neutra)
NATURES = [
    ("hardy", 0, 0), ("lonely", 1, 2), ("brave", 1, 5), ("adamant", 1, 3), ("naughty", 1, 4),
    ("bold", 2, 1), ("docile", 0, 0), ("relaxed", 2, 5), ("impish", 2, 3), ("lax", 2, 4),
    ("timid", 5, 1), ("hasty", 5, 2), ("serious", 0, 0), ("jolly", 5, 3), ("naive", 5, 4),
    ("modest", 3, 1), ("mild", 3, 2), ("quiet", 3, 5), ("bashful", 0, 0), ("rash", 3, 4),
    ("calm", 4, 1), ("gentle", 4, 2), ("sassy", 4, 5), ("careful", 4, 3), ("quirky", 0, 0),
]

STAT_ES = ["PS", "Ataque", "Defensa", "At. Esp.", "Def. Esp.", "Velocidad"]
TYPE_BOOSTERS = [
    ("silk_scarf", "Silk Scarf", "Normal"), ("charcoal_stick", "Charcoal", "Fuego"), ("mystic_water", "Mystic Water", "Agua"),
    ("miracle_seed", "Miracle Seed", "Planta"), ("magnet", "Magnet", "Eléctrico"), ("never_melt_ice", "Never-Melt Ice", "Hielo"),
    ("black_belt", "Black Belt", "Lucha"), ("poison_barb", "Poison Barb", "Veneno"), ("soft_sand", "Soft Sand", "Tierra"),
    ("sharp_beak", "Sharp Beak", "Volador"), ("twisted_spoon", "Twisted Spoon", "Psíquico"), ("silver_powder", "Silver Powder", "Bicho"),
    ("hard_stone", "Hard Stone", "Roca"), ("spell_tag", "Spell Tag", "Fantasma"), ("dragon_fang", "Dragon Fang", "Dragón"),
    ("black_glasses", "Black Glasses", "Siniestro"), ("metal_coat", "Metal Coat", "Acero"), ("fairy_feather", "Fairy Feather", "Hada"),
]
RESIST_BERRIES = [
    ("chilan_berry", "Chilan Berry", "Normal"), ("occa_berry", "Occa Berry", "Fuego"), ("passho_berry", "Passho Berry", "Agua"),
    ("rindo_berry", "Rindo Berry", "Planta"), ("wacan_berry", "Wacan Berry", "Eléctrico"), ("yache_berry", "Yache Berry", "Hielo"),
    ("chople_berry", "Chople Berry", "Lucha"), ("kebia_berry", "Kebia Berry", "Veneno"), ("shuca_berry", "Shuca Berry", "Tierra"),
    ("coba_berry", "Coba Berry", "Volador"), ("payapa_berry", "Payapa Berry", "Psíquico"), ("tanga_berry", "Tanga Berry", "Bicho"),
    ("charti_berry", "Charti Berry", "Roca"), ("kasib_berry", "Kasib Berry", "Fantasma"), ("haban_berry", "Haban Berry", "Dragón"),
    ("colbur_berry", "Colbur Berry", "Siniestro"), ("babiri_berry", "Babiri Berry", "Acero"), ("roseli_berry", "Roseli Berry", "Hada"),
]
GEM_EN = {"Normal": "Normal", "Fuego": "Fire", "Agua": "Water", "Planta": "Grass", "Eléctrico": "Electric", "Hielo": "Ice",
          "Lucha": "Fighting", "Veneno": "Poison", "Tierra": "Ground", "Volador": "Flying", "Psíquico": "Psychic",
          "Bicho": "Bug", "Roca": "Rock", "Fantasma": "Ghost", "Dragón": "Dragon", "Siniestro": "Dark", "Acero": "Steel", "Hada": "Fairy"}
GEM_ID = {"Normal": "normal", "Fuego": "fire", "Agua": "water", "Planta": "grass", "Eléctrico": "electric", "Hielo": "ice",
          "Lucha": "fighting", "Veneno": "poison", "Tierra": "ground", "Volador": "flying", "Psíquico": "psychic", "Bicho": "bug",
          "Roca": "rock", "Fantasma": "ghost", "Dragón": "dragon", "Siniestro": "dark", "Acero": "steel", "Hada": "fairy"}

# Objetos competitivos curados: (id de Cobblemon, nombre inglés de Showdown, categoría, efecto breve).
# Categorías: of = ofensivo, de = defensivo, ve = velocidad, so = soporte, ba = bayas, cr = crianza y EVs
ITEMS = [
    ("life_orb", "Life Orb", "of", "+30 % de daño; pierde 1/10 de sus PS cada vez que ataca."),
    ("choice_band", "Choice Band", "of", "+50 % de Ataque, pero queda bloqueado en el primer movimiento que use."),
    ("choice_specs", "Choice Specs", "of", "+50 % de At. Esp., pero queda bloqueado en el primer movimiento que use."),
    ("expert_belt", "Expert Belt", "of", "+20 % de daño con los movimientos súper eficaces."),
    ("muscle_band", "Muscle Band", "of", "+10 % de daño con los movimientos físicos."),
    ("wise_glasses", "Wise Glasses", "of", "+10 % de daño con los movimientos especiales."),
    ("weakness_policy", "Weakness Policy", "of", "Al recibir un golpe súper eficaz: +2 Ataque y +2 At. Esp. Un solo uso."),
    ("throat_spray", "Throat Spray", "of", "+1 At. Esp. después de usar un movimiento de sonido. Un solo uso."),
    ("loaded_dice", "Loaded Dice", "of", "Los movimientos de 2 a 5 golpes aciertan casi siempre 4 o 5 veces."),
    ("punching_glove", "Punching Glove", "of", "+10 % a los movimientos de puño, que además dejan de hacer contacto."),
    ("scope_lens", "Scope Lens", "of", "Sube un nivel el índice de golpe crítico."),
    ("razor_claw", "Razor Claw", "of", "Sube un nivel el índice de golpe crítico (también sirve para evolucionar a Weavile y Gliscor)."),
    ("power_herb", "Power Herb", "of", "Ejecuta al instante un movimiento de dos turnos (Rayo Solar, Rayo Meteórico…). Un solo uso."),
    ("light_ball", "Light Ball", "of", "Duplica el Ataque y el At. Esp. de Pikachu."),
    ("choice_scarf", "Choice Scarf", "ve", "+50 % de Velocidad, pero queda bloqueado en el primer movimiento que use."),
    ("quick_claw", "Quick Claw", "ve", "20 % de probabilidad de actuar el primero en su prioridad."),
    ("room_service", "Room Service", "ve", "−1 Velocidad al activarse Espacio Raro. Un solo uso."),
    ("blunder_policy", "Blunder Policy", "ve", "+2 Velocidad si falla un movimiento por precisión. Un solo uso."),
    ("quick_powder", "Quick Powder", "ve", "Duplica la Velocidad de Ditto si no se ha transformado."),
    ("leftovers", "Leftovers", "de", "Recupera 1/16 de sus PS máximos al final de cada turno."),
    ("black_sludge", "Black Sludge", "de", "Tipo Veneno: recupera 1/16 de PS por turno. Otros tipos: pierden 1/8."),
    ("assault_vest", "Assault Vest", "de", "+50 % de Def. Esp., pero solo puede usar movimientos de daño."),
    ("eviolite", "Eviolite", "de", "+50 % de Defensa y Def. Esp. si el portador todavía puede evolucionar."),
    ("rocky_helmet", "Rocky Helmet", "de", "Quien le golpee con contacto pierde 1/6 de sus PS máximos."),
    ("heavy_duty_boots", "Heavy-Duty Boots", "de", "No recibe daño ni efectos de Trampa Rocas, Púas, Púas Tóxicas ni Red Viscosa."),
    ("focus_sash", "Focus Sash", "de", "Con los PS al máximo, aguanta con 1 PS un golpe que lo debilitaría. Un solo uso."),
    ("focus_band", "Focus Band", "de", "10 % de probabilidad de aguantar con 1 PS un golpe que lo debilitaría."),
    ("shell_bell", "Shell Bell", "de", "Recupera 1/8 del daño que causa."),
    ("air_balloon", "Air Balloon", "de", "Inmune a los ataques de tipo Tierra hasta que recibe un golpe."),
    ("bright_powder", "Bright Powder", "de", "Reduce un 10 % la precisión de los movimientos rivales. No confundir con la Capa Furtiva."),
    ("metal_powder", "Metal Powder", "de", "Duplica la Defensa de Ditto si no se ha transformado."),
    ("light_clay", "Light Clay", "so", "Reflejo, Pantalla Luz y Velo Aurora duran 8 turnos en vez de 5."),
    ("damp_rock", "Damp Rock", "so", "Danza Lluvia dura 8 turnos en vez de 5."),
    ("heat_rock", "Heat Rock", "so", "Día Soleado dura 8 turnos en vez de 5."),
    ("smooth_rock", "Smooth Rock", "so", "Tormenta Arena dura 8 turnos en vez de 5."),
    ("icy_rock", "Icy Rock", "so", "El granizo o la nieve dura 8 turnos en vez de 5."),
    ("terrain_extender", "Terrain Extender", "so", "Los campos (Eléctrico, Hierba, Psíquico, Niebla) duran 8 turnos."),
    ("covert_cloak", "Covert Cloak", "so", "Le protege de los efectos secundarios de los movimientos rivales (retroceso, bajadas…)."),
    ("clear_amulet", "Clear Amulet", "so", "Impide que otros Pokémon le bajen las estadísticas (Intimidación incluida)."),
    ("safety_goggles", "Safety Goggles", "so", "Inmune a los movimientos de polvo y esporas y al daño de la Tormenta Arena y el granizo."),
    ("utility_umbrella", "Utility Umbrella", "so", "El portador ignora los efectos del sol y de la lluvia."),
    ("protective_pads", "Protective Pads", "so", "Sus ataques de contacto no activan Casco Dentado ni habilidades de contacto."),
    ("ability_shield", "Ability Shield", "so", "Su habilidad no puede cambiarse, anularse ni ignorarse."),
    ("mental_herb", "Mental Herb", "so", "Cura Mofa, Otra Vez, Tormento, Anulación, Atracción y Bis. Un solo uso."),
    ("white_herb", "White Herb", "so", "Anula las bajadas de estadísticas en cuanto se producen. Un solo uso."),
    ("mirror_herb", "Mirror Herb", "so", "Copia las subidas de estadísticas de un rival. Un solo uso."),
    ("red_card", "Red Card", "so", "Al recibir un golpe, obliga al atacante a volver y salir otro Pokémon. Un solo uso."),
    ("eject_button", "Eject Button", "so", "Al recibir un golpe, el portador se retira y entra un compañero. Un solo uso."),
    ("eject_pack", "Eject Pack", "so", "Si le bajan una estadística, el portador se retira. Un solo uso."),
    ("shed_shell", "Shed Shell", "so", "Puede cambiarse aunque un rival intente atraparlo."),
    ("wide_lens", "Wide Lens", "so", "+10 % de precisión en sus movimientos."),
    ("flame_orb", "Flame Orb", "so", "Quema al portador al final del turno. Para Agallas o Antídoto… o para Truco."),
    ("toxic_orb", "Toxic Orb", "so", "Envenena gravemente al portador. Para Antídoto (Poison Heal), Agallas o Truco."),
    ("sitrus_berry", "Sitrus Berry", "ba", "Al bajar de la mitad de PS, recupera 1/4 de sus PS máximos."),
    ("lum_berry", "Lum Berry", "ba", "Cura cualquier problema de estado o la confusión. Un solo uso."),
    ("chesto_berry", "Chesto Berry", "ba", "Le despierta al dormirse. Combo clásico con Descanso."),
    ("figy_berry", "Figy Berry", "ba", "Al 25 % de PS recupera 1/3. Confunde a las naturalezas que bajan el Ataque."),
    ("wiki_berry", "Wiki Berry", "ba", "Al 25 % de PS recupera 1/3. Confunde a las naturalezas que bajan el At. Esp."),
    ("mago_berry", "Mago Berry", "ba", "Al 25 % de PS recupera 1/3. Confunde a las naturalezas que bajan la Velocidad."),
    ("aguav_berry", "Aguav Berry", "ba", "Al 25 % de PS recupera 1/3. Confunde a las naturalezas que bajan la Def. Esp."),
    ("iapapa_berry", "Iapapa Berry", "ba", "Al 25 % de PS recupera 1/3. Confunde a las naturalezas que bajan la Defensa."),
    ("liechi_berry", "Liechi Berry", "ba", "Al 25 % de PS: +1 Ataque. Ideal con Sustituto o Banda Aguante."),
    ("petaya_berry", "Petaya Berry", "ba", "Al 25 % de PS: +1 At. Esp."),
    ("salac_berry", "Salac Berry", "ba", "Al 25 % de PS: +1 Velocidad."),
    ("ganlon_berry", "Ganlon Berry", "ba", "Al 25 % de PS: +1 Defensa."),
    ("apicot_berry", "Apicot Berry", "ba", "Al 25 % de PS: +1 Def. Esp."),
    ("starf_berry", "Starf Berry", "ba", "Al 25 % de PS: +2 en una estadística al azar."),
    ("custap_berry", "Custap Berry", "ba", "Al 25 % de PS actúa el primero en su prioridad una vez."),
    ("jaboca_berry", "Jaboca Berry", "ba", "Si recibe un golpe físico, el atacante pierde 1/8 de sus PS."),
    ("rowap_berry", "Rowap Berry", "ba", "Si recibe un golpe especial, el atacante pierde 1/8 de sus PS."),
    ("kee_berry", "Kee Berry", "ba", "Al recibir un golpe físico: +1 Defensa."),
    ("maranga_berry", "Maranga Berry", "ba", "Al recibir un golpe especial: +1 Def. Esp."),
    ("power_weight", "Power Weight", "cr", "Entrenamiento: +8 EVs de PS por rival derrotado. Reduce a la mitad la Velocidad."),
    ("power_bracer", "Power Bracer", "cr", "Entrenamiento: +8 EVs de Ataque por rival derrotado. Reduce a la mitad la Velocidad."),
    ("power_belt", "Power Belt", "cr", "Entrenamiento: +8 EVs de Defensa por rival derrotado. Reduce a la mitad la Velocidad."),
    ("power_lens", "Power Lens", "cr", "Entrenamiento: +8 EVs de At. Esp. por rival derrotado. Reduce a la mitad la Velocidad."),
    ("power_band", "Power Band", "cr", "Entrenamiento: +8 EVs de Def. Esp. por rival derrotado. Reduce a la mitad la Velocidad."),
    ("power_anklet", "Power Anklet", "cr", "Entrenamiento: +8 EVs de Velocidad por rival derrotado. Reduce a la mitad la Velocidad."),
    ("destiny_knot", "Destiny Knot", "cr", "En combate contagia el enamoramiento. En Diosesmon no lo uses para criar: reparte los IVs al azar."),
    ("everstone", "Everstone", "cr", "Impide evolucionar. En la guardería transmite la naturaleza del padre que la lleva."),
]
for key, en, type_es in TYPE_BOOSTERS:
    ITEMS.append((key, en, "of", f"+20 % de daño a los movimientos de tipo {type_es}."))
for type_es, type_en in GEM_EN.items():
    ITEMS.append((f"{GEM_ID[type_es]}_gem", f"{type_en} Gem", "of", f"+30 % al primer movimiento de tipo {type_es} que use. Un solo uso."))
for key, en, type_es in RESIST_BERRIES:
    extra = "" if type_es == "Normal" else " súper eficaz"
    ITEMS.append((key, en, "ba", f"Reduce a la mitad un golpe{extra} de tipo {type_es}. Un solo uso."))

SHOWDOWN_NAME_FIX = {"nidoran-f": "Nidoran-F", "nidoran-m": "Nidoran-M"}
FORM_SUFFIX = {"alola": "Alola", "galar": "Galar", "hisui": "Hisui", "paldea": "Paldea",
               "paldea-combat": "Paldea-Combat", "paldea-blaze": "Paldea-Blaze", "paldea-aqua": "Paldea-Aqua"}
FORM_ES = {"alola": "de Alola", "galar": "de Galar", "hisui": "de Hisui", "paldea": "de Paldea",
           "paldea-combat": "de Paldea (Combatiente)", "paldea-blaze": "de Paldea (Ardiente)", "paldea-aqua": "de Paldea (Acuática)"}
POKEAPI_FORM = {"paldea-combat": "paldea-combat-breed", "paldea-blaze": "paldea-blaze-breed", "paldea-aqua": "paldea-aqua-breed"}


B64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"


def b64(value, width):
    chars = []
    for _ in range(width):
        chars.append(B64[value % 64])
        value //= 64
    assert value == 0, "valor demasiado grande para la codificación"
    return "".join(reversed(chars))


def load_js(path):
    text = path.read_text(encoding="utf-8")
    out = {}
    for match in re.finditer(r"window\.(\w+)\s*=\s*", text):
        value, _ = json.JSONDecoder().raw_decode(text, match.end())
        out[match.group(1)] = value
    return out


def csv_rows(name):
    with open(CACHE / f"pokeapi-{name}", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def names_by_lang(rows, id_key):
    result = {ES: {}, EN: {}}
    for row in rows:
        lang = row["local_language_id"]
        if lang in result:
            result[lang][row[id_key]] = row["name"]
    return result


def main():
    species = load_js(FUSION / "data" / "pokemon-data.js")["POKEDEX_SPECIES"]
    details_js = load_js(FUSION / "data" / "pokemon-details.js")
    details, detail_moves = details_js["POKEDEX_DETAILS"], details_js["POKEDEX_DETAIL_MOVES"]
    cobble_lang = json.loads((CACHE / "cobblemon-1.7.3-es_es.json").read_text(encoding="utf-8"))

    # Movimientos: nombre español -> fila de PokéAPI
    moves_csv = {row["id"]: row for row in csv_rows("moves.csv")}
    move_names = names_by_lang(csv_rows("move_names.csv"), "move_id")
    move_by_es = {}
    for move_id, name in move_names[ES].items():
        if move_id in moves_csv:
            move_by_es.setdefault(name, move_id)

    # Habilidades: nombre español -> inglés
    ability_names = names_by_lang(csv_rows("ability_names.csv"), "ability_id")
    ability_by_es = {}
    for ability_id, name in ability_names[ES].items():
        ability_by_es.setdefault(name, ability_id)

    species_en = names_by_lang([dict(r, local_language_id=r["local_language_id"]) for r in csv_rows("pokemon_species_names.csv")],
                               "pokemon_species_id")[EN]
    pokemon_ids = {row["identifier"]: int(row["id"]) for row in csv_rows("pokemon.csv")}

    used_moves, move_index = [], {}
    abilities, ability_index = [], {}
    warnings = []

    def move_ref(detail_index):
        es_name = detail_moves[detail_index]
        if es_name not in move_index:
            move_id = move_by_es.get(es_name)
            if not move_id:
                warnings.append(f"Movimiento sin datos de PokéAPI: {es_name}")
                return None
            row = moves_csv[move_id]
            category = {"1": 0, "2": 1, "3": 2}[row["damage_class_id"]]
            move_index[es_name] = len(used_moves)
            used_moves.append([
                es_name, move_names[EN].get(move_id, row["identifier"]), int(row["type_id"]) - 1, category,
                int(row["power"] or 0), int(row["accuracy"] or 0), int(row["pp"] or 0), int(row["priority"] or 0),
            ])
        return move_index[es_name]

    def ability_ref(es_name):
        if es_name not in ability_index:
            ability_id = ability_by_es.get(es_name)
            en_name = ability_names[EN].get(ability_id) if ability_id else None
            if not en_name:
                warnings.append(f"Habilidad sin nombre inglés: {es_name}")
                en_name = es_name
            ability_index[es_name] = len(abilities)
            abilities.append([es_name, en_name])
        return ability_index[es_name]

    def learnset(raw):
        codes = {}
        levels = {}
        for level, detail_index in raw["level"]:
            ref = move_ref(detail_index)
            if ref is None:
                continue
            codes[ref] = codes.get(ref, 0) | 1
            levels[ref] = min(levels.get(ref, 999), level)
        for method, bit in (("tm", 2), ("egg", 4), ("tutor", 8)):
            for detail_index in raw[method]:
                ref = move_ref(detail_index)
                if ref is not None:
                    codes[ref] = codes.get(ref, 0) | bit
        # Cadena compacta: por movimiento, 2 caracteres de índice + 1 de métodos (+ 2 de nivel si se aprende por nivel)
        out = []
        for ref, bits in sorted(codes.items()):
            out.append(b64(ref, 2) + B64[bits] + (b64(levels[ref], 2) if bits & 1 else ""))
        return "".join(out)

    def entry(national, es_name, en_name, data, sprite=0, form=None, treasure=False, evolves=False):
        ability_list = data["abilities"]
        normal = []
        hidden = -1
        for ability in ability_list:
            ref = ability_ref(ability["name"])
            if ability["hidden"]:
                hidden = ref
            elif ref not in normal:
                normal.append(ref)
        stats = data["stats"]
        item = {
            "n": national, "es": es_name, "en": en_name,
            "t": [TYPE_INDEX[t] for t in data["types"]],
            "b": [stats["hp"], stats["attack"], stats["defense"], stats["specialAttack"], stats["specialDefense"], stats["speed"]],
            "a": normal, "h": hidden, "m": learnset(data["moves"]),
        }
        if sprite:
            item["s"] = sprite
        if form:
            item["f"] = form
        if treasure:
            item["tr"] = 1
        if evolves:
            item["ev"] = 1
        return item

    available = [s for s in species if s.get("available")]
    available_ids = {s["id"] for s in available}
    children = {}
    for s in available:
        if s.get("evolvesFrom") in available_ids:
            children.setdefault(s["evolvesFrom"], []).append(s["id"])

    out_species = []
    for s in available:
        detail = details[str(s["id"])]
        en_name = SHOWDOWN_NAME_FIX.get(s["identifier"], species_en.get(str(s["id"]), s["identifier"].title()))
        out_species.append(entry(s["id"], s["name"], en_name, detail, treasure=bool(s.get("treasure")),
                                 evolves=bool(children.get(s["id"]))))
        for form_key, form in detail.get("forms", {}).items():
            if form_key not in FORM_SUFFIX:
                warnings.append(f"Forma desconocida {s['name']} {form_key}")
                continue
            pokeapi_form = f"{s['identifier']}-{POKEAPI_FORM.get(form_key, form_key)}"
            sprite = pokemon_ids.get(pokeapi_form) or pokemon_ids.get(pokeapi_form + "-standard") or s["id"]
            evolves = any(form_key in details[str(child)].get("forms", {}) for child in children.get(s["id"], []))
            out_species.append(entry(s["id"], f"{s['name']} {FORM_ES[form_key]}", f"{en_name}-{FORM_SUFFIX[form_key]}",
                                     form, sprite=sprite, form=form_key, evolves=evolves))

    items = []
    for key, en_name, category, effect in ITEMS:
        es_name = cobble_lang.get(f"item.cobblemon.{key}")
        if not es_name:
            warnings.append(f"Objeto que NO existe en Cobblemon 1.7.3 (descartado): {key}")
            continue
        items.append([key, es_name, en_name, category, effect])

    natures = []
    for en_key, up, down in NATURES:
        natures.append([cobble_lang[f"cobblemon.nature.{en_key}"], en_key.title(), up, down])

    chart = "".join(EFF_CODE[CHART[att].get(dfn, 1)] for att, _ in TYPES for dfn, _ in TYPES)

    data = {
        "version": 1,
        "types": TYPES,
        "chart": chart,
        "stats": STAT_ES,
        "natures": natures,
        "abilities": abilities,
        "moves": used_moves,
        "items": items,
        "species": out_species,
    }
    OUT.parent.mkdir(exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(
        "// Generado por tools/build_competitivo_data.py desde Cobblemon 1.7.3 y PokéAPI. No editar a mano.\n"
        "// moves: [es, en, tipo, categoría (0 estado, 1 física, 2 especial), potencia, precisión (0 = no falla), PP, prioridad]\n"
        "// species.m: cadena con alfabeto 0-9A-Za-z-_; por movimiento 2 car. de índice, 1 de métodos\n"
        "//   (1 nivel, 2 MT, 4 huevo, 8 tutor) y, si se aprende por nivel, 2 car. con el nivel\n"
        "// species: n nacional, t tipos, b stats base, a habilidades, h oculta (-1 = no), s sprite de forma, f forma,\n"
        "//   tr legendario de Tesoros, ev puede evolucionar (Mineral Evolutivo)\n"
        "// chart: 18x18 atacante·defensor, 0 = inmune, 1 = ½, 2 = neutro, 3 = ×2\n"
        f"window.DIOSESMON_COMP = {payload};\n",
        encoding="utf-8",
    )
    print(f"{len(out_species)} especies/formas, {len(used_moves)} movimientos, {len(abilities)} habilidades, {len(items)} objetos")
    print(f"{OUT} ({OUT.stat().st_size // 1024} KB)")
    for warning in warnings:
        print("AVISO:", warning)


if __name__ == "__main__":
    main()
