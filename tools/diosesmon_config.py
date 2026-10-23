"""Qué Pokémon están disponibles en Diosesmon (compartido por los generadores de datos)."""

# Generaciones activas en el servidor: 1 a 5 (hasta Teselia).
AVAILABLE_THROUGH = 649

# Legendarios de otras generaciones que salen en los Tesoros (cajas de Pokémon Legendario y Legendario Shiny).
# Se pueden conseguir e intercambiar, así que la wiki los trata como disponibles.
TREASURE_LEGENDARIES = {
    494: "Victini", 638: "Cobalion", 639: "Terrakion", 641: "Tornadus", 642: "Thundurus", 645: "Landorus",
    648: "Meloetta", 649: "Genesect", 716: "Xerneas", 717: "Yveltal", 718: "Zygarde", 785: "Tapu Koko",
    786: "Tapu Lele", 787: "Tapu Bulu", 788: "Tapu Fini", 789: "Cosmog", 790: "Cosmoem", 801: "Magearna",
    802: "Marshadow", 808: "Meltan", 809: "Melmetal", 891: "Kubfu", 893: "Zarude", 894: "Regieleki",
    895: "Regidrago", 1002: "Chien-Pao", 1025: "Pecharunt",
}


def is_available(national_id):
    return national_id <= AVAILABLE_THROUGH or national_id in TREASURE_LEGENDARIES
