// Cambia estos dos textos para actualizar el mensaje de la pantalla.
// No se requiere instalación, base de datos ni compilación.
// Agrega ventanas a esta lista con fecha ISO y zona horaria de Sinaloa (-07:00).
// La pantalla selecciona la ventana abierta o la siguiente y avanza al terminar.
window.ROCKET_WINDOWS = [
  // estado: 'programada', 'cancelada' o 'exitosa'. El resultado se conserva al publicar.
  {nombre:'ALFA-1', inicio:'2026-11-10T08:30:00-07:00', fin:'2026-11-10T11:30:00-07:00', estado:'programada', motivo:''},
  {nombre:'ALFA-2', inicio:'2026-11-11T07:00:00-07:00', fin:'2026-11-11T08:00:00-07:00', estado:'programada', motivo:'', qr:'assets/qr-ALFA-2.png', pagina:'https://echucuan.github.io/rocketTecSinaloa2026/ventanas/ALFA-2.html'},
  {nombre:'ALFA-3', inicio:'2026-11-11T10:00:00-07:00', fin:'2026-11-11T11:00:00-07:00', estado:'programada', motivo:'', qr:'assets/qr-ALFA-3.png', pagina:'https://echucuan.github.io/rocketTecSinaloa2026/ventanas/ALFA-3.html'}
];
window.ROCKET_TEC = {
  etiqueta: 'NUESTRA MISIÓN',
  mensaje: 'Diseñar, construir y poner a prueba\nlo que somos capaces de imaginar.'
};
