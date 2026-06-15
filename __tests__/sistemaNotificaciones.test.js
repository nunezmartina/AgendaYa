const {
  validarEmail,
  generarAsuntoConfirmacion,
  confirmarReserva,
  puedeReintentarEnvio,
  calcularProximoIntento,
  procesarFalloEnvio,
  notificarAdmin,
  obtenerBadgeNoLeidas,
  marcarTodoComoLeido,
  programarRecordatorio,
  cancelarRecordatorio,
  crearPlantilla,
  editarPlantilla,
  eliminarPlantilla,
  generarUrlReReserva,
  enmascararEmail,
  obtenerHistorialNotificaciones,
} = require("../src/sistemaNotificaciones");

// Limpia el estado antes de cada test para evitar interferencias
beforeEach(() => {
  jest.resetModules();
});

/**--------------Tests relacionados con US-M06-001: Confirmación de reserva--------------*/

// Test 1: Confirma una reserva correctamente con un email válido
test("Confirma una reserva correctamente con un email válido", () => {
  const result = confirmarReserva(
    "maria@email.com",
    "Consulta inicial",
    "14/05/2025",
    "10:30 hs",
    "Dr. García"
  );
  expect(result.success).toBe(true);
  expect(result.reserva.estado).toBe("confirmada");
  expect(result.reserva.asunto).toBe("Tu reserva con Dr. García está confirmada");
});

// Test 2: No confirma la reserva si el email tiene formato inválido
test("No confirma la reserva si el email tiene formato inválido", () => {
  const result = confirmarReserva(
    "usuario@",
    "Consulta inicial",
    "14/05/2025",
    "10:30 hs",
    "Dr. García"
  );
  console.log(result.mensaje);
  expect(result.success).toBe(false);
  expect(result.mensaje).toMatch(/email ingresado no es válido/i);
});

// Test 3: No confirma la reserva si faltan datos obligatorios
test("No confirma la reserva si faltan datos obligatorios", () => {
  const result = confirmarReserva("maria@email.com", "", "14/05/2025", "10:30 hs", "Dr. García");
  console.log(result.mensaje);
  expect(result.success).toBe(false);
  expect(result.mensaje).toMatch(/faltan datos/i);
});

// Test 4: Genera el asunto del email de confirmación correctamente
test("Genera el asunto del email de confirmación correctamente", () => {
  const result = generarAsuntoConfirmacion("Dr. García");
  expect(result.success).toBe(true);
  expect(result.asunto).toBe("Tu reserva con Dr. García está confirmada");
});

// Test 5: Valida un email con formato correcto
test("Valida un email con formato correcto", () => {
  expect(validarEmail("usuario@dominio.com")).toBe(true);
});

// Test 6: Rechaza un email con formato inválido
test("Rechaza un email con formato inválido", () => {
  expect(validarEmail("usuario@")).toBe(false);
  expect(validarEmail("usuario.com")).toBe(false);
});

/**--------------Tests relacionados con US-M06-001 (errores): reintentos de envío--------------*/

// Test 7: Permite reintentar el envío si lleva menos de 3 intentos
test("Permite reintentar el envío si lleva menos de 3 intentos", () => {
  const result = puedeReintentarEnvio(1);
  expect(result.success).toBe(true);
  expect(result.puedeReintentar).toBe(true);
});

// Test 8: No permite reintentar el envío al llegar a 3 intentos
test("No permite reintentar el envío al llegar a 3 intentos", () => {
  const result = puedeReintentarEnvio(3);
  expect(result.puedeReintentar).toBe(false);
});

// Test 9: El intervalo entre reintentos es siempre de 30 segundos
test("El intervalo entre reintentos es siempre de 30 segundos", () => {
  const result = calcularProximoIntento(1);
  expect(result.success).toBe(true);
  expect(result.segundos).toBe(30);
});

// Test 10: La reserva mantiene su estado confirmado aunque falle el envío del email
test("La reserva mantiene su estado confirmado aunque falle el envío del email", () => {
  const { reserva } = confirmarReserva(
    "lau@email.com",
    "Consulta",
    "20/05/2025",
    "09:00 hs",
    "Dr. García"
  );
  const result = procesarFalloEnvio(reserva, 1);
  console.log(result.reserva.estado);
  expect(result.success).toBe(true);
  expect(result.reserva.estado).toBe("confirmada");
  expect(result.puedeReintentar).toBe(true);
});

/**--------------Tests relacionados con US-M06-002: Notificación al administrador--------------*/

// Test 11: Notifica al admin ante una nueva reserva
test("Notifica al admin ante una nueva reserva", () => {
  const result = notificarAdmin("nueva_reserva", "María Gómez", "maria@email.com", "14/05", "10:30 hs");
  expect(result.success).toBe(true);
  expect(result.notificado).toBe(true);
  expect(result.notificacion.asunto).toBe("Nueva reserva — María Gómez — 14/05 10:30 hs");
});

// Test 12: Notifica al admin ante una cancelación con el asunto correcto
test("Notifica al admin ante una cancelación con el asunto correcto", () => {
  const result = notificarAdmin("cancelacion", "Juan Pérez", "juan@email.com", "12/05", "15:00 hs");
  expect(result.success).toBe(true);
  expect(result.notificacion.asunto).toBe("Cancelación — Juan Pérez — 12/05 15:00 hs");
});

// Test 13: No notifica al admin si la acción la realizó él mismo
test("No notifica al admin si la acción la realizó él mismo", () => {
  const result = notificarAdmin("cancelacion", "Juan Pérez", "juan@email.com", "12/05", "15:00 hs", "admin");
  console.log(result.mensaje);
  expect(result.success).toBe(true);
  expect(result.notificado).toBe(false);
});

// Test 14: El badge de notificaciones no leídas se incrementa con cada notificación
test("El badge de notificaciones no leídas se incrementa con cada notificación", () => {
  notificarAdmin("nueva_reserva", "Ana", "ana@email.com", "01/06", "11:00 hs");
  notificarAdmin("nueva_reserva", "Pedro", "pedro@email.com", "02/06", "12:00 hs");
  const badge = obtenerBadgeNoLeidas();
  expect(badge).toBeGreaterThanOrEqual(2);
});

// Test 15: Marcar todo como leído resetea el badge a 0
test("Marcar todo como leído resetea el badge a 0", () => {
  notificarAdmin("nueva_reserva", "Sofi", "sofi@email.com", "03/06", "13:00 hs");
  const result = marcarTodoComoLeido();
  expect(result.success).toBe(true);
  expect(result.badge).toBe(0);
});

/**--------------Tests relacionados con US-M06-003: Recordatorio 24hs antes--------------*/

// Test 16: Programa el recordatorio 24hs antes si el turno es a más de 24hs
test("Programa el recordatorio 24hs antes si el turno es a más de 24hs", () => {
  const reserva = new Date("2025-06-20T10:00:00");
  const turno = new Date("2025-06-23T10:00:00");
  const result = programarRecordatorio("res-1", turno, reserva);
  expect(result.success).toBe(true);
  expect(result.recordatorio.estado).toBe("programado");
  expect(result.recordatorio.fechaEnvio.toISOString()).toBe(
    new Date("2025-06-22T10:00:00").toISOString()
  );
});

// Test 17: No programa recordatorio si la reserva fue de último momento (menos de 24hs)
test("No programa recordatorio si la reserva fue de último momento", () => {
  const reserva = new Date("2025-06-20T10:00:00");
  const turno = new Date("2025-06-20T18:00:00");
  const result = programarRecordatorio("res-2", turno, reserva);
  console.log(result.recordatorio.estado);
  expect(result.success).toBe(true);
  expect(result.recordatorio.estado).toBe("no aplica");
});

// Test 18: Cancela el recordatorio si la reserva asociada se cancela antes del envío
test("Cancela el recordatorio si la reserva asociada se cancela antes del envío", () => {
  const reserva = new Date("2025-06-20T10:00:00");
  const turno = new Date("2025-06-25T10:00:00");
  programarRecordatorio("res-3", turno, reserva);
  const result = cancelarRecordatorio("res-3");
  expect(result.success).toBe(true);
  expect(result.recordatorio.estado).toBe("cancelado");
});

/**--------------Tests relacionados con US-M06-004: ABM Plantillas (ALTA)--------------*/

// Test 19: Crea una plantilla y la marca como por defecto si es la primera de su tipo
test("Crea una plantilla y la marca como por defecto si es la primera de su tipo", () => {
  const result = crearPlantilla(
    "Confirmación formal",
    "Confirmación al invitado",
    { asunto: "Tu reserva con {nombre_profesional} está confirmada", saludo: "", cuerpo: "", firma: "" },
    false
  );
  expect(result.success).toBe(true);
  expect(result.plantilla.porDefecto).toBe(true);
});

// Test 20: La segunda plantilla del mismo tipo no queda por defecto si el tick no está activado
test("La segunda plantilla del mismo tipo no queda por defecto si el tick no está activado", () => {
  crearPlantilla("Recordatorio estándar", "Recordatorio al invitado", { asunto: "a", saludo: "b", cuerpo: "c", firma: "d" }, false);
  const result = crearPlantilla("Recordatorio verano", "Recordatorio al invitado", { asunto: "a2", saludo: "b2", cuerpo: "c2", firma: "d2" }, false);
  expect(result.success).toBe(true);
  expect(result.plantilla.porDefecto).toBe(false);
});

// Test 21: No permite crear una plantilla con un nombre ya existente
test("No permite crear una plantilla con un nombre ya existente", () => {
  crearPlantilla("Cancelación con motivo", "Cancelación al invitado", { asunto: "a", saludo: "b", cuerpo: "c", firma: "d" }, true);
  const result = crearPlantilla("Cancelación con motivo", "Cancelación al invitado", { asunto: "x", saludo: "y", cuerpo: "z", firma: "w" }, false);
  console.log(result.mensaje);
  expect(result.success).toBe(false);
  expect(result.mensaje).toMatch(/ya existe una plantilla con ese nombre/i);
});

/**--------------Tests relacionados con US-M06-005: ABM Plantillas (MODIFICACIÓN)--------------*/

// Test 22: Edita una plantilla y completa con texto por defecto si un campo queda vacío
test("Edita una plantilla y completa con texto por defecto si un campo queda vacío", () => {
  crearPlantilla("Confirmación breve", "Confirmación al invitado", { asunto: "Asunto custom", saludo: "Hola!", cuerpo: "Cuerpo", firma: "Firma" }, false);
  const result = editarPlantilla("Confirmación breve", { contenido: { saludo: "" } });
  expect(result.success).toBe(true);
  expect(result.plantilla.contenido.saludo).toBe(
    "Hola {nombre_invitado}, te escribimos de parte de {nombre_profesional}."
  );
});

// Test 23: No permite desactivar el tick "Por defecto" si es la única plantilla del tipo
test("No permite desactivar el tick Por defecto si es la única plantilla del tipo", () => {
  crearPlantilla("Cancelación única", "Cancelación al invitado X", { asunto: "a", saludo: "b", cuerpo: "c", firma: "d" }, true);
  const result = editarPlantilla("Cancelación única", { porDefecto: false });
  console.log(result.mensaje);
  expect(result.success).toBe(false);
  expect(result.mensaje).toMatch(/no podés quitar el estado por defecto/i);
});

// Test 24: El historial de versiones mantiene como máximo 5 versiones
test("El historial de versiones mantiene como máximo 5 versiones", () => {
  crearPlantilla("Plantilla historial", "Notificación al admin (nueva reserva)", { asunto: "v0", saludo: "s", cuerpo: "c", firma: "f" }, true);
  for (let i = 1; i <= 6; i++) {
    editarPlantilla("Plantilla historial", { contenido: { asunto: `v${i}` } });
  }
  const result = editarPlantilla("Plantilla historial", {});
  expect(result.plantilla.historial.length).toBeLessThanOrEqual(5);
});

/**--------------Tests relacionados con US-M06-006/008/009: BAJA, Re-reserva, Historial--------------*/

// Test 25: No permite eliminar la única plantilla de un tipo
test("No permite eliminar la única plantilla de un tipo", () => {
  crearPlantilla("Notif admin reserva", "Notificación al admin (nueva reserva) v2", { asunto: "a", saludo: "b", cuerpo: "c", firma: "d" }, true);
  const result = eliminarPlantilla("Notif admin reserva");
  console.log(result.mensaje);
  expect(result.success).toBe(false);
  expect(result.mensaje).toMatch(/no podés eliminar la única plantilla/i);
});

// Test 26: Permite eliminar una plantilla alternativa (no por defecto) cuando hay otra del tipo
test("Permite eliminar una plantilla alternativa cuando hay otra del tipo", () => {
  crearPlantilla("Recordatorio A", "Recordatorio al invitado v2", { asunto: "a", saludo: "b", cuerpo: "c", firma: "d" }, true);
  crearPlantilla("Recordatorio B", "Recordatorio al invitado v2", { asunto: "a2", saludo: "b2", cuerpo: "c2", firma: "d2" }, false);
  const result = eliminarPlantilla("Recordatorio B");
  expect(result.success).toBe(true);
  expect(result.mensaje).toMatch(/plantilla eliminada correctamente/i);
});

// Test 27: Genera la URL pública de la agenda para re-reserva
test("Genera la URL pública de la agenda para re-reserva", () => {
  const result = generarUrlReReserva("dr-garcia");
  expect(result.success).toBe(true);
  expect(result.url).toBe("agendaya.com/agenda/dr-garcia");
});

// Test 28: Enmascara el email correctamente para el historial de notificaciones
test("Enmascara el email correctamente para el historial de notificaciones", () => {
  const result = enmascararEmail("usuario@email.com");
  expect(result.success).toBe(true);
  expect(result.emailEnmascarado).toBe("us***@email.com");
});

// Test 29: El historial de notificaciones devuelve los emails enmascarados
test("El historial de notificaciones devuelve los emails enmascarados", () => {
  notificarAdmin("nueva_reserva", "Carla Diaz", "carla@email.com", "10/06", "08:00 hs");
  const historial = obtenerHistorialNotificaciones();
  const ultima = historial[historial.length - 1];
  expect(ultima.destinatario).toBe("ca***@email.com");
});