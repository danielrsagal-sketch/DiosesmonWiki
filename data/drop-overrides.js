// Ajustes de drops propios de Diosesmon. Editar a mano; no requiere regenerar datos.
//
// Clave: identificador inglés del Pokémon (el mismo de la URL de Cobbledex, p. ej. "mr-mime").
// disabled: objetos de Cobblemon que el servidor tiene desactivados para ese Pokémon.
//           Se muestran tachados con la etiqueta "Desactivado en Diosesmon".
// note:     texto opcional que aparece bajo la tabla de drops.
window.DIOSESMON_DROP_OVERRIDES = {
  snorlax: { disabled: ["cobblemon:leftovers"] },
  munchlax: { disabled: ["cobblemon:leftovers"] },
};
