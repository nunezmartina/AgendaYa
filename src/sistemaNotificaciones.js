// src/sistemaNotificaciones.js
// Código fuente mínimo del módulo M06 - Notificaciones y Comunicaciones (AgendaYA)
// Basado en las historias de usuario US-M06-001 a US-M06-009 (TP2)
// Prueba de Pull Request - CI pipeline AgendaYA

const VEINTICUATRO_HORAS_EN_MS = 24 * 60 * 60 * 1000;

// "Base de datos" en memoria
const plantillas = [];
const notificacionesAdmin = [];
const recordatorios = [];

/* ======================================================
   US-M06-001: Email de confirmación al reservar
   ====================================================== */

// Valida que un email tenga formato correcto
function validarEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Genera el asunto del email de confirmación
function generarAsuntoConfirmacion(nombreProfesional) {
  if (!nombreProfesional) {
    return { success: false, mensaje: "Falta el nombre del profesional" };
  }
  return { success: true, asunto: `Tu reserva con ${nombreProfesional} está confirmada` };
}

// Confirma una reserva: valida el email y arma el mensaje de confirmación
function confirmarReserva(email, tipoEvento, fecha, hora, profesional) {
  if (!email || !tipoEvento || !fecha || !hora || !profesional) {
    return { success: false, mensaje: "Faltan datos para confirmar la reserva" };
  }

  if (!validarEmail(email)) {
    return { success: false, mensaje: "El email ingresado no es válido. Ej: usuario@dominio.com" };
  }

  const mensaje = {
    tipoEvento,
    fecha,
    hora,
    profesional,
    asunto: `Tu reserva con ${profesional} está confirmada`,
  };

  return { success: true, reserva: { estado: "confirmada", email, ...mensaje } };
}

/* ======================================================
   US-M06-001 (errores): reintentos de envío de email
   ====================================================== */

const MAX_INTENTOS = 3;
const INTERVALO_REINTENTO_SEG = 30;

// Indica si se puede reintentar el envío del email
function puedeReintentarEnvio(intentosRealizados) {
  if (typeof intentosRealizados !== "number" || intentosRealizados < 0) {
    return { success: false, mensaje: "Cantidad de intentos inválida" };
  }
  return { success: true, puedeReintentar: intentosRealizados < MAX_INTENTOS };
}

// Calcula los segundos de espera hasta el próximo reintento
function calcularProximoIntento(intentoActual) {
  if (intentoActual < 1 || intentoActual > MAX_INTENTOS) {
    return { success: false, mensaje: "intentoActual debe estar entre 1 y 3" };
  }
  return { success: true, segundos: INTERVALO_REINTENTO_SEG };
}

// Procesa un fallo de envío: la reserva nunca se revierte por esto
function procesarFalloEnvio(reserva, intentosRealizados) {
  if (!reserva) {
    return { success: false, mensaje: "No existe la reserva" };
  }

  const { puedeReintentar } = puedeReintentarEnvio(intentosRealizados);

  return {
    success: true,
    reserva: { ...reserva, estado: "confirmada" }, // el fallo de email no revierte la reserva
    puedeReintentar,
  };
}

/* ======================================================
   US-M06-002: Notificación al administrador
   ====================================================== */

// Notifica al administrador ante una nueva reserva o cancelación
function notificarAdmin(tipoEvento, nombreInvitado, email, fecha, hora, actor = "invitado") {
  if (!tipoEvento || !nombreInvitado || !fecha || !hora) {
    return { success: false, mensaje: "Faltan datos para notificar al administrador" };
  }

  // Si el propio admin realizó la acción, no se le notifica
  if (actor === "admin") {
    return { success: true, notificado: false, mensaje: "El admin no se notifica de sus propias acciones" };
  }

  const asunto =
    tipoEvento === "cancelacion"
      ? `Cancelación — ${nombreInvitado} — ${fecha} ${hora}`
      : `Nueva reserva — ${nombreInvitado} — ${fecha} ${hora}`;

  const notificacion = {
    id: notificacionesAdmin.length + 1,
    tipoEvento,
    nombreInvitado,
    email,
    fecha,
    hora,
    asunto,
    leida: false,
  };

  notificacionesAdmin.push(notificacion);

  return { success: true, notificado: true, notificacion };
}

// Devuelve la cantidad de notificaciones no leídas (badge)
function obtenerBadgeNoLeidas() {
  return notificacionesAdmin.filter((n) => !n.leida).length;
}

// Marca todas las notificaciones del admin como leídas
function marcarTodoComoLeido() {
  notificacionesAdmin.forEach((n) => {
    n.leida = true;
  });
  return { success: true, badge: obtenerBadgeNoLeidas() };
}

/* ======================================================
   US-M06-003: Recordatorio automático 24hs antes
   ====================================================== */

// Programa el recordatorio para una reserva confirmada
function programarRecordatorio(idReserva, fechaHoraTurno, fechaHoraReserva) {
  if (!idReserva || !(fechaHoraTurno instanceof Date) || !(fechaHoraReserva instanceof Date)) {
    return { success: false, mensaje: "Datos inválidos para programar el recordatorio" };
  }

  const diferencia = fechaHoraTurno.getTime() - fechaHoraReserva.getTime();

  // Reserva de último momento: no se programa recordatorio
  if (diferencia < VEINTICUATRO_HORAS_EN_MS) {
    const recordatorio = { idReserva, estado: "no aplica" };
    recordatorios.push(recordatorio);
    return { success: true, recordatorio };
  }

  const fechaEnvio = new Date(fechaHoraTurno.getTime() - VEINTICUATRO_HORAS_EN_MS);
  const recordatorio = { idReserva, estado: "programado", fechaEnvio };
  recordatorios.push(recordatorio);

  return { success: true, recordatorio };
}

// Cancela el recordatorio asociado a una reserva (si estaba programado)
function cancelarRecordatorio(idReserva) {
  const recordatorio = recordatorios.find((r) => r.idReserva === idReserva);

  if (!recordatorio) {
    return { success: false, mensaje: "No existe recordatorio para esa reserva" };
  }

  if (recordatorio.estado === "programado") {
    recordatorio.estado = "cancelado";
  }

  return { success: true, recordatorio };
}

/* ======================================================
   US-M06-004: ABM Plantillas - ALTA
   ====================================================== */

// Crea una nueva plantilla de email
function crearPlantilla(nombre, tipo, contenido, porDefecto = false) {
  if (!nombre || !tipo || !contenido) {
    return { success: false, mensaje: "Faltan datos obligatorios de la plantilla" };
  }

  if (plantillas.find((p) => p.nombre === nombre)) {
    return { success: false, mensaje: "Ya existe una plantilla con ese nombre. Usá un nombre diferente." };
  }

  const esPrimeraDelTipo = !plantillas.some((p) => p.tipo === tipo);
  const quedaPorDefecto = esPrimeraDelTipo || porDefecto;

  // Si la nueva queda por defecto, desplaza a la anterior por defecto de ese tipo
  if (quedaPorDefecto) {
    plantillas.forEach((p) => {
      if (p.tipo === tipo) {
        p.porDefecto = false;
      }
    });
  }

  const nuevaPlantilla = {
    nombre,
    tipo,
    contenido,
    porDefecto: quedaPorDefecto,
    historial: [],
  };

  plantillas.push(nuevaPlantilla);

  return { success: true, plantilla: nuevaPlantilla };
}

/* ======================================================
   US-M06-005: ABM Plantillas - MODIFICACIÓN
   ====================================================== */

const TEXTOS_POR_DEFECTO = {
  saludo: "Hola {nombre_invitado}, te escribimos de parte de {nombre_profesional}.",
  asunto: "Tu reserva con {nombre_profesional} está confirmada",
  cuerpo: "",
  firma: "AgendaYA",
};

// Edita una plantilla existente
function editarPlantilla(nombre, cambios) {
  const plantilla = plantillas.find((p) => p.nombre === nombre);

  if (!plantilla) {
    return { success: false, mensaje: "Plantilla no encontrada" };
  }

  // No se puede desactivar el tick "Por defecto" si es la única del tipo
  if (plantilla.porDefecto && cambios.porDefecto === false) {
    const existeOtraDelTipo = plantillas.some(
      (p) => p.tipo === plantilla.tipo && p.nombre !== plantilla.nombre
    );
    if (!existeOtraDelTipo) {
      return {
        success: false,
        mensaje: "No podés quitar el estado por defecto si es la única plantilla de este tipo.",
      };
    }
  }

  // Guarda la versión anterior en el historial (máximo 5)
  const versionAnterior = { contenido: plantilla.contenido, fecha: new Date() };
  plantilla.historial = [versionAnterior, ...plantilla.historial].slice(0, 5);

  // Campos de contenido vacíos se completan con el texto por defecto
  if (cambios.contenido) {
    Object.keys(cambios.contenido).forEach((campo) => {
      const valor = cambios.contenido[campo];
      const valorFinal =
        !valor || valor.trim() === "" ? TEXTOS_POR_DEFECTO[campo] || "" : valor;
      plantilla.contenido[campo] = valorFinal;
    });
  }

  // Si activa el tick, desplaza a la anterior por defecto del mismo tipo
  if (cambios.porDefecto === true && !plantilla.porDefecto) {
    plantillas.forEach((p) => {
      if (p.tipo === plantilla.tipo) {
        p.porDefecto = false;
      }
    });
    plantilla.porDefecto = true;
  } else if (cambios.porDefecto === false && plantilla.porDefecto) {
    plantilla.porDefecto = false;
  }

  return { success: true, plantilla };
}

/* ======================================================
   US-M06-006 / 008 / 009: BAJA, Re-reserva, Historial
   ====================================================== */

// Elimina una plantilla, respetando las restricciones del ABM
function eliminarPlantilla(nombre) {
  const plantilla = plantillas.find((p) => p.nombre === nombre);

  if (!plantilla) {
    return { success: false, mensaje: "Plantilla no encontrada" };
  }

  const otrasDelTipo = plantillas.filter(
    (p) => p.tipo === plantilla.tipo && p.nombre !== plantilla.nombre
  );

  // No se puede eliminar si es la única del tipo
  if (otrasDelTipo.length === 0) {
    return {
      success: false,
      mensaje: "No podés eliminar la única plantilla de este tipo. Creá otra antes de eliminar esta.",
    };
  }

  // No se puede eliminar si es la por defecto y no hay otra marcada como por defecto
  if (plantilla.porDefecto && !otrasDelTipo.some((p) => p.porDefecto)) {
    return {
      success: false,
      mensaje: "Esta plantilla es la por defecto. Designá otra como por defecto antes de eliminarla.",
    };
  }

  const indice = plantillas.indexOf(plantilla);
  plantillas.splice(indice, 1);

  return { success: true, mensaje: "Plantilla eliminada correctamente" };
}

// Genera la URL pública de la agenda del profesional (botón "Reservar nuevo turno")
function generarUrlReReserva(nombreAdmin) {
  if (!nombreAdmin) {
    return { success: false, mensaje: "Falta el nombre del administrador" };
  }
  return { success: true, url: `agendaya.com/agenda/${nombreAdmin}` };
}

// Enmascara un email para el historial de notificaciones (ej: "us***@email.com")
function enmascararEmail(email) {
  if (!validarEmail(email)) {
    return { success: false, mensaje: "Email inválido" };
  }

  const [usuario, dominio] = email.split("@");
  const visibles = usuario.slice(0, 2);

  return { success: true, emailEnmascarado: `${visibles}***@${dominio}` };
}

// Devuelve el historial de notificaciones (confirmaciones, recordatorios, cancelaciones)
function obtenerHistorialNotificaciones() {
  return notificacionesAdmin.map((n) => ({
    tipo: n.tipoEvento,
    destinatario: enmascararEmail(n.email).emailEnmascarado || n.email,
    fecha: n.fecha,
    hora: n.hora,
    leida: n.leida,
  }));
}

module.exports = {
  // US-M06-001
  validarEmail,
  generarAsuntoConfirmacion,
  confirmarReserva,
  // US-M06-001 (errores)
  puedeReintentarEnvio,
  calcularProximoIntento,
  procesarFalloEnvio,
  // US-M06-002
  notificarAdmin,
  obtenerBadgeNoLeidas,
  marcarTodoComoLeido,
  // US-M06-003
  programarRecordatorio,
  cancelarRecordatorio,
  // US-M06-004
  crearPlantilla,
  // US-M06-005
  editarPlantilla,
  // US-M06-006 / 008 / 009
  eliminarPlantilla,
  generarUrlReReserva,
  enmascararEmail,
  obtenerHistorialNotificaciones,
};