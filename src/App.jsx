import React, { useState, useEffect, useMemo, useCallback } from "react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

/* ---------- Datos base ---------- */

const COMISIONES_DEFAULT = ["Administración", "Obra", "Compras", "Trabajo", "CEFIC", "Fiscales"];

const COLORES_COMISION = {
  "Administración": "#2E5C4F",
  "Obra": "#8A6A1E",
  "Compras": "#5B4A8A",
  "Trabajo": "#1E6B6B",
  "CEFIC": "#B5482E",
  "Fiscales": "#3C3C3C",
  "Sin comisión": "#9B958A",
};

/* paleta de respaldo para comisiones nuevas que no tienen color fijo asignado */
const PALETA_EXTRA = ["#7A6F4E", "#4E6B7A", "#7A4E63", "#4E7A5E", "#6F4E7A", "#7A5E4E"];
function colorComision(nombre) {
  if (COLORES_COMISION[nombre]) return COLORES_COMISION[nombre];
  if (!nombre) return COLORES_COMISION["Sin comisión"];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return PALETA_EXTRA[hash % PALETA_EXTRA.length];
}

const DIAS_LIBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const DIAS_GUARDIA = ["Sábado", "Domingo"];
const SLOTS = [
  { key: "sab1", dia: "Sábado", horario: "07:00 a 12:00", corto: "Sáb mañana", horas: 5 },
  { key: "sab2", dia: "Sábado", horario: "12:00 a 17:00", corto: "Sáb tarde", horas: 5 },
  { key: "sab3", dia: "Sábado", horario: "17:00 a 22:00", corto: "Sáb noche", horas: 5 },
  { key: "dom1", dia: "Domingo", horario: "07:00 a 12:00", corto: "Dom mañana", horas: 5 },
  { key: "dom2", dia: "Domingo", horario: "12:00 a 17:00", corto: "Dom tarde", horas: 5 },
  { key: "dom3", dia: "Domingo", horario: "17:00 a 22:00", corto: "Dom noche", horas: 5 },
];
const SLOTS_LIBRES = [
  { key: "lunes", dia: "Lunes", horario: "18:00 a 22:00", corto: "Lunes", horas: 4 },
  { key: "martes", dia: "Martes", horario: "18:00 a 22:00", corto: "Martes", horas: 4 },
  { key: "miercoles", dia: "Miércoles", horario: "18:00 a 22:00", corto: "Miércoles", horas: 4 },
  { key: "jueves", dia: "Jueves", horario: "18:00 a 22:00", corto: "Jue", horas: 4 },
  { key: "viernes", dia: "Viernes", horario: "18:00 a 22:00", corto: "Vie", horas: 4 },
];
const DIA_A_SLOT_LIBRE = { Lunes: "lunes", Martes: "martes", Miércoles: "miercoles", Jueves: "jueves", Viernes: "viernes" };
const TODOS_LOS_SLOTS = SLOTS.concat(SLOTS_LIBRES);
const SLOT_HORAS = {};
TODOS_LOS_SLOTS.forEach((s) => { SLOT_HORAS[s.key] = s.horas; });
/* horas por defecto de los días de bloque único (18 a 22). Si esa semana se activa
   el horario alternativo (17 a 22) para ese día puntual, pasan a valer 5hs. */
const DIA_HORAS_DEFAULT = { Lunes: 4, Martes: 4, Miércoles: 4, Jueves: 4, Viernes: 4 };

function horasLibreDia(w, dia) {
  const alterno = w.horarioAlterno && w.horarioAlterno[dia];
  return alterno ? 5 : (DIA_HORAS_DEFAULT[dia] || 4);
}

function horarioLibreDia(w, dia) {
  const alterno = w.horarioAlterno && w.horarioAlterno[dia];
  return alterno ? "17:00 a 22:00" : "18:00 a 22:00";
}

const MIEMBROS_INICIALES = [
  ["Franco Contreras", null, false],
  ["Janet Hernández", null, false],
  ["Marisa Reyes", null, false],
  ["Dahiana González", "Administración", true],
  ["Lucía Gomes", "Administración", true],
  ["Javier Alvez", "Administración", false],
  ["Florencia Olivera", "Administración", false],
  ["Paula Argenta", "Administración", false],
  ["Victoria García", "Obra", true],
  ["Jorge Rodríguez", "Obra", true],
  ["Maximiliano Pacheco", "Obra", false],
  ["Nadia Molinari", "Obra", false],
  ["Yeniffer Rodríguez", "Compras", true],
  ["Mariangeles Soler", "Compras", true],
  ["Martin Rodríguez", "Compras", false],
  ["Ana Lira", "CEFIC", true],
  ["Patricia Pommereck", "Trabajo", true],
  ["Carlos Díaz", "Trabajo", false],
  ["Noelia Pintos", "Trabajo", false],
  ["Mariela Rodríguez", "Trabajo", false],
  ["Claudia Vega", "CEFIC", true],
  ["Patricia Gamboa", "CEFIC", true],
  ["Giovana Sosa", "CEFIC", false],
  ["Enzo Soria", "Fiscales", true],
  ["Lourdes Rivoira", "Fiscales", true],
  ["Carmen Rivoira", "Fiscales", false],
  ["Ana Laura Francia", null, false],
  ["Daniela Silvera", null, false],
  ["Lourdes González", null, false],
  ["Miriam Silva", null, false],
  ["Cecilia Cuayatto", null, false],
  ["Patricia Coelho", null, false],
  ["Yanila Ilundain", null, false],
  ["Juliana Ilundain", null, false],
  ["Luana Garay", null, false],
  ["Irene Delgado", null, false],
  ["Matias Núñez", "Compras", false],
  ["Santiago Giles", null, false],
  ["Katherine Díaz", null, false],
  ["Valentina Sosa", null, false],
  ["Noelia Ortiz", null, false],
  ["Federico López", null, false],
].map(([nombre, comision, delegado], i) => ({
  id: "m" + (i + 1),
  nombre,
  comision,
  delegado,
}));

function proximoLunes(desde) {
  const d = new Date(desde);
  const dia = d.getDay();
  const diff = (8 - dia) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/* lunes de la semana que contiene la fecha dada (a diferencia de proximoLunes, que
   siempre salta a la semana siguiente) */
function inicioSemanaDe(desde) {
  const d = new Date(desde);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatearRango(lunesISO) {
  const lunes = new Date(lunesISO + "T00:00:00");
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const opts = { day: "numeric", month: "long" };
  const fmt = new Intl.DateTimeFormat("es-UY", opts);
  return `${fmt.format(lunes)} al ${fmt.format(domingo)}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function semanaVacia(id, start) {
  return { id, start, slots: {}, unavailable: {}, freeAssign: {}, horarioAlterno: {} };
}

function sumarSemana(w, totals) {
  Object.entries(w.slots || {}).forEach(([slotKey, ids]) => {
    const horas = SLOT_HORAS[slotKey] || 5;
    (ids || []).forEach((id) => {
      if (totals[id] == null) return;
      totals[id].horas += horas;
      totals[id].turnos += 1;
    });
  });
  Object.entries(w.freeAssign || {}).forEach(([dia, ids]) => {
    const horas = horasLibreDia(w, dia);
    (ids || []).forEach((id) => {
      if (totals[id] == null) return;
      totals[id].horas += horas;
      totals[id].turnos += 1;
    });
  });
}

function estaDisponible(disponibilidad, memberId, slotKey) {
  const m = disponibilidad[memberId];
  if (!m) return true;
  return m[slotKey] !== false;
}


/* ---------- Historial / PDF ---------- */

const DIA_OFFSET = {
  Lunes: 0,
  Martes: 1,
  Miércoles: 2,
  Jueves: 3,
  Viernes: 4,
  Sábado: 5,
  Domingo: 6,
};

function sumarDiasISO(fechaISO, dias) {
  const d = new Date(fechaISO + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function fechaUY(fechaISO) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fechaISO + "T12:00:00"));
}

function registrosHistorial(weeks, memberById) {
  const registros = [];

  weeks.forEach((week) => {
    DIAS_LIBRES.forEach((dia) => {
      const fecha = sumarDiasISO(week.start, DIA_OFFSET[dia]);
      const ids = (week.freeAssign && week.freeAssign[dia]) || [];
      ids.forEach((id) => {
        const m = memberById[id];
        if (!m) return;
        registros.push({
          fecha,
          dia,
          horario: horarioLibreDia(week, dia),
          socio: m.nombre,
          comision: m.comision || "Sin comisión",
          tipo: "Rotación",
          horas: horasLibreDia(week, dia),
        });
      });
    });

    SLOTS.forEach((slot) => {
      const fecha = sumarDiasISO(week.start, DIA_OFFSET[slot.dia]);
      const ids = (week.slots && week.slots[slot.key]) || [];
      ids.forEach((id) => {
        const m = memberById[id];
        if (!m) return;
        registros.push({
          fecha,
          dia: slot.dia,
          horario: slot.horario,
          socio: m.nombre,
          comision: m.comision || "Sin comisión",
          tipo: "Guardia",
          horas: slot.horas,
        });
      });
    });
  });

  return registros.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario) || a.socio.localeCompare(b.socio));
}

function descargarHistorialPDF(registros, desde, hasta) {
  const filtrados = registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const totalHoras = filtrados.reduce((s, r) => s + r.horas, 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Historial de guardias y rotaciones", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Período: ${fechaUY(desde)} al ${fechaUY(hasta)}`, 14, 23);
  doc.text(`Registros: ${filtrados.length}  |  Horas asignadas: ${totalHoras}`, 14, 29);

  autoTable(doc, {
    startY: 35,
    head: [["Fecha", "Día", "Horario", "Socio", "Comisión", "Tipo", "Horas"]],
    body: filtrados.map((r) => [
      fechaUY(r.fecha),
      r.dia,
      r.horario,
      r.socio,
      r.comision,
      r.tipo,
      `${r.horas} hs`,
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [27, 58, 48], textColor: [246, 243, 236] },
    alternateRowStyles: { fillColor: [246, 243, 236] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 48 },
      4: { cellWidth: 36 },
      5: { cellWidth: 27 },
      6: { cellWidth: 18, halign: "right" },
    },
    didDrawPage: () => {
      const page = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Página ${page}`, 282, 202, { align: "right" });
    },
  });

  if (!filtrados.length) {
    doc.setFontSize(11);
    doc.text("No hay guardias o rotaciones registradas dentro del período seleccionado.", 14, 45);
  }

  doc.save(`historial-guardias_${desde}_${hasta}.pdf`);
}

/* ---------- Persistencia ---------- */

async function storageGet(key) {
  const res = await fetch(`/api/storage/${encodeURIComponent(key)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Error leyendo ${key}: ${res.status}`);
  return res.json();
}

async function storageSet(key, value) {
  const res = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Error guardando ${key}: ${res.status}`);
  return res.json();
}

function useStoredState(key, initial) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const ultimaEscrituraLocal = React.useRef(0);
  const guardando = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await storageGet(key);
        if (mounted && res && res.value != null) setValue(JSON.parse(res.value));
      } catch (e) {
        console.error("Error cargando", key, e);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [key]);

  const persist = useCallback(async (next) => {
    setValue(next);
    ultimaEscrituraLocal.current = Date.now();
    guardando.current = true;
    try {
      await storageSet(key, JSON.stringify(next));
    } catch (e) {
      console.error("Error guardando", key, e);
    } finally {
      guardando.current = false;
      ultimaEscrituraLocal.current = Date.now();
    }
  }, [key]);

  const refrescar = useCallback(async () => {
    if (guardando.current || Date.now() - ultimaEscrituraLocal.current < 10000) return;
    try {
      const res = await storageGet(key);
      if (res && res.value != null) setValue(JSON.parse(res.value));
    } catch (e) {
      console.error("Error refrescando", key, e);
    }
  }, [key]);

  return [value, persist, loaded, refrescar];
}

/* ---------- App ---------- */

export default function App() {
  const [tab, setTab] = useState("calendario");
  const [members, setMembers, membersLoaded, refrescarMembers] = useStoredState("coop-members-v2", MIEMBROS_INICIALES);
  const [weeks, setWeeks, weeksLoaded, refrescarWeeks] = useStoredState("coop-weeks-v5", []);
  const [disponibilidad, setDisponibilidad, dispoLoaded, refrescarDispo] = useStoredState("coop-disponibilidad-v1", {});
  const [comisiones, setComisiones, comisionesLoaded, refrescarComisiones] = useStoredState("coop-comisiones-v1", COMISIONES_DEFAULT);
  const [undoStack, setUndoStack] = useState({});
  const [seleccionado, setSeleccionado] = useState(null);
  const [activeWeek, setActiveWeek] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [exportarAbierto, setExportarAbierto] = useState(false);

  const ready = membersLoaded && weeksLoaded && dispoLoaded && comisionesLoaded;

  const guardarCambios = async () => {
    setGuardando(true);
    setGuardadoOk(false);
    await Promise.all([
      setMembers(members),
      setWeeks(weeks),
      setDisponibilidad(disponibilidad),
      setComisiones(comisiones),
    ]);
    setGuardando(false);
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 2500);
  };

  useEffect(() => {
    if (!ready) return;
    const intervalo = setInterval(() => {
      refrescarMembers();
      refrescarWeeks();
      refrescarDispo();
      refrescarComisiones();
    }, 15000);
    return () => clearInterval(intervalo);
  }, [ready, refrescarMembers, refrescarWeeks, refrescarDispo, refrescarComisiones]);

  useEffect(() => {
    if (ready && weeks.length === 0) {
      const w = semanaVacia("w1", proximoLunes(new Date()));
      setWeeks([w]);
      setActiveWeek(w.id);
    } else if (ready && !activeWeek) {
      setActiveWeek(weeks[0]?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const memberById = useMemo(() => {
    const map = {};
    members.forEach((m) => (map[m.id] = m));
    return map;
  }, [members]);

  const historialRegistros = useMemo(() => registrosHistorial(weeks, memberById), [weeks, memberById]);

  const horasHasta = useCallback((weekId) => {
    const totals = {};
    members.forEach((m) => (totals[m.id] = { horas: 0, turnos: 0 }));
    for (const w of weeks) {
      if (w.id === weekId) break;
      sumarSemana(w, totals);
    }
    return totals;
  }, [members, weeks]);

  const horasTotales = useMemo(() => {
    const totals = {};
    members.forEach((m) => (totals[m.id] = { horas: 0, turnos: 0 }));
    weeks.forEach((w) => sumarSemana(w, totals));
    return totals;
  }, [members, weeks]);

  /* ---------- Miembros ---------- */

  const updateMember = (id, patch) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const addMember = () => {
    const id = "m" + Date.now();
    setMembers([...members, { id, nombre: "Nuevo socio", comision: null, delegado: false }]);
  };

  const addComision = (nombre) => {
    const limpio = (nombre || "").trim();
    if (!limpio) return;
    if (comisiones.some((c) => c.toLowerCase() === limpio.toLowerCase())) return;
    setComisiones([...comisiones, limpio]);
  };

  const removeMember = (id) => {
    setMembers(members.filter((m) => m.id !== id));
    setWeeks(
      weeks.map((w) => {
        const slots = {};
        Object.entries(w.slots || {}).forEach(([k, ids]) => { slots[k] = (ids || []).filter((mid) => mid !== id); });
        const freeAssign = {};
        Object.entries(w.freeAssign || {}).forEach(([k, ids]) => { freeAssign[k] = (ids || []).filter((mid) => mid !== id); });
        return { ...w, slots, freeAssign };
      })
    );
  };

  /* ---------- Disponibilidad ---------- */

  const toggleDisponibilidadMiembro = (memberId, slotKey) => {
    const actual = estaDisponible(disponibilidad, memberId, slotKey);
    setDisponibilidad({
      ...disponibilidad,
      [memberId]: { ...(disponibilidad[memberId] || {}), [slotKey]: !actual },
    });
  };

  const marcarTodoDisponible = (memberId, valor) => {
    const fila = {};
    TODOS_LOS_SLOTS.forEach((s) => { fila[s.key] = valor; });
    setDisponibilidad({ ...disponibilidad, [memberId]: fila });
  };

  /* ---------- Semanas / calendario ---------- */

  const addWeek = () => {
    const last = weeks[weeks.length - 1];
    const start = last ? proximoLunes(new Date(last.start + "T00:00:00")) : proximoLunes(new Date());
    const nueva = semanaVacia("w" + Date.now(), start);
    setWeeks([...weeks, nueva]);
    setActiveWeek(nueva.id);
  };

  const removeWeek = (id) => {
    const restantes = weeks.filter((w) => w.id !== id);
    setWeeks(restantes);
    if (activeWeek === id) setActiveWeek(restantes[0]?.id || null);
  };

  const setSlotAssignment = (weekId, slotKey, ids) => {
    setWeeks(weeks.map((w) => (w.id === weekId ? { ...w, slots: { ...w.slots, [slotKey]: ids } } : w)));
  };

  const toggleDisponibilidadSemana = (weekId, dia, memberId) => {
    setWeeks(weeks.map((w) => {
      if (w.id !== weekId) return w;
      const actuales = (w.unavailable && w.unavailable[dia]) || [];
      const nuevas = actuales.includes(memberId) ? actuales.filter((id) => id !== memberId) : [...actuales, memberId];
      return { ...w, unavailable: { ...(w.unavailable || {}), [dia]: nuevas } };
    }));
  };

  const toggleHorarioAlterno = (weekId, dia) => {
    setWeeks(weeks.map((w) => {
      if (w.id !== weekId) return w;
      const actual = !!(w.horarioAlterno && w.horarioAlterno[dia]);
      return { ...w, horarioAlterno: { ...(w.horarioAlterno || {}), [dia]: !actual } };
    }));
  };

  const addFreeAssign = (weekId, dia, memberId) => {
    setWeeks(weeks.map((w) => {
      if (w.id !== weekId) return w;
      const actuales = (w.freeAssign && w.freeAssign[dia]) || [];
      if (actuales.includes(memberId)) return w;
      return { ...w, freeAssign: { ...(w.freeAssign || {}), [dia]: [...actuales, memberId] } };
    }));
  };

  const removeFreeAssign = (weekId, dia, memberId) => {
    setWeeks(weeks.map((w) => {
      if (w.id !== weekId) return w;
      const actuales = (w.freeAssign && w.freeAssign[dia]) || [];
      return { ...w, freeAssign: { ...(w.freeAssign || {}), [dia]: actuales.filter((id) => id !== memberId) } };
    }));
  };

  const construirPoolSlot = (slotKey, cargaMap, unavailableDia) => {
    let pool = shuffle(members.map((m) => m.id));
    pool = pool.filter((id) => !(unavailableDia || []).includes(id));
    pool = pool.filter((id) => estaDisponible(disponibilidad, id, slotKey));
    pool.sort((a, b) => (cargaMap[a] ?? 0) - (cargaMap[b] ?? 0));
    return pool;
  };

  /* arma turnos (Sáb/Dom) y bloques únicos (Lun-Vie) para una semana, sumando la carga
     horaria a medida que asigna para que la prioridad se actualice dentro de la misma semana */
  const asignarSemanaCompleta = (week, cargaMap) => {
    const nuevosSlots = {};
    DIAS_GUARDIA.forEach((dia) => {
      const unavailableDia = (week.unavailable && week.unavailable[dia]) || [];
      const usadosHoy = new Set();
      SLOTS.filter((s) => s.dia === dia).forEach((slot) => {
        let pool = construirPoolSlot(slot.key, cargaMap, unavailableDia).filter((id) => !usadosHoy.has(id));
        let elegidos = pool.slice(0, 3);
        if (elegidos.length < 3) {
          const relleno = construirPoolSlot(slot.key, cargaMap, unavailableDia).filter((id) => !elegidos.includes(id));
          elegidos = [...elegidos, ...relleno].slice(0, 3);
        }
        elegidos.forEach((id) => { usadosHoy.add(id); cargaMap[id] = (cargaMap[id] || 0) + (SLOT_HORAS[slot.key] || 5); });
        nuevosSlots[slot.key] = elegidos;
      });
    });

    const nuevosLibres = {};
    DIAS_LIBRES.forEach((dia) => {
      const slotKey = DIA_A_SLOT_LIBRE[dia];
      const unavailableDia = (week.unavailable && week.unavailable[dia]) || [];
      let pool = construirPoolSlot(slotKey, cargaMap, unavailableDia);
      let elegidos = pool.slice(0, 3);
      const horas = horasLibreDia(week, dia);
      elegidos.forEach((id) => { cargaMap[id] = (cargaMap[id] || 0) + horas; });
      nuevosLibres[dia] = elegidos;
    });

    return { nuevosSlots, nuevosLibres };
  };

  const generarSemana = (weekId) => {
    const week = weeks.find((w) => w.id === weekId);
    const libresPrevios = {};
    DIAS_LIBRES.forEach((dia) => { libresPrevios[dia] = week.freeAssign?.[dia] || []; });
    setUndoStack((prev) => ({
      ...prev,
      [weekId]: { slots: week.slots, libres: libresPrevios },
    }));

    const totalsIniciales = horasHasta(weekId);
    const cargaMap = {};
    members.forEach((m) => (cargaMap[m.id] = totalsIniciales[m.id]?.horas || 0));

    const { nuevosSlots, nuevosLibres } = asignarSemanaCompleta(week, cargaMap);

    setWeeks(weeks.map((w) => (w.id === weekId ? {
      ...w,
      slots: nuevosSlots,
      freeAssign: { ...w.freeAssign, ...nuevosLibres },
    } : w)));
  };

  const revertirSemana = (weekId) => {
    const prev = undoStack[weekId];
    if (!prev) return;
    setWeeks(weeks.map((w) => (w.id === weekId ? {
      ...w,
      slots: prev.slots,
      freeAssign: { ...w.freeAssign, ...prev.libres },
    } : w)));
    setUndoStack((s) => { const c = { ...s }; delete c[weekId]; return c; });
  };

  const irASemanaActual = () => {
    const lunesActual = inicioSemanaDe(new Date());
    const existente = weeks.find((w) => w.start === lunesActual);
    if (existente) {
      setActiveWeek(existente.id);
      return;
    }
    const nueva = semanaVacia("w" + Date.now(), lunesActual);
    setWeeks([...weeks, nueva].sort((a, b) => a.start.localeCompare(b.start)));
    setActiveWeek(nueva.id);
  };

  const editarFechaSemana = (weekId, fechaISO) => {
    if (!fechaISO) return;
    const lunesCorregido = inicioSemanaDe(fechaISO + "T00:00:00");
    setWeeks(
      weeks
        .map((w) => (w.id === weekId ? { ...w, start: lunesCorregido } : w))
        .sort((a, b) => a.start.localeCompare(b.start))
    );
  };

  if (!ready || !activeWeek) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#2E5C4F" }}>
        Cargando guardias…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F3EC", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#242018" }}>
      <Header guardarCambios={guardarCambios} guardando={guardando} guardadoOk={guardadoOk} onExportar={() => setExportarAbierto(true)} />
      <NavTabs tab={tab} setTab={setTab} />
      {exportarAbierto && (
        <ExportarPDFModal
          registros={historialRegistros}
          onCerrar={() => setExportarAbierto(false)}
        />
      )}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 60px" }}>
        {tab === "miembros" && (
          <MiembrosTab members={members} addMember={addMember} updateMember={updateMember} removeMember={removeMember} comisiones={comisiones} addComision={addComision} />
        )}
        {tab === "disponibilidad" && (
          <DisponibilidadTab members={members} disponibilidad={disponibilidad} toggleDisponibilidadMiembro={toggleDisponibilidadMiembro} marcarTodoDisponible={marcarTodoDisponible} />
        )}
        {tab === "calendario" && (
          <CalendarioTab
            weeks={weeks}
            members={members}
            memberById={memberById}
            activeWeek={activeWeek}
            setActiveWeek={setActiveWeek}
            addWeek={addWeek}
            removeWeek={removeWeek}
            setSlotAssignment={setSlotAssignment}
            generarSemana={generarSemana}
            revertirSemana={revertirSemana}
            puedeRevertir={(weekId) => !!undoStack[weekId]}
            irASemanaActual={irASemanaActual}
            editarFechaSemana={editarFechaSemana}
            horasHasta={horasHasta}
            toggleDisponibilidadSemana={toggleDisponibilidadSemana}
            toggleHorarioAlterno={toggleHorarioAlterno}
            disponibilidad={disponibilidad}
            addFreeAssign={addFreeAssign}
            removeFreeAssign={removeFreeAssign}
            seleccionado={seleccionado}
            setSeleccionado={setSeleccionado}
          />
        )}
        {tab === "horas" && <HorasTab members={members} horasTotales={horasTotales} />}
      </div>
    </div>
  );
}

/* ---------- Header & Nav ---------- */

function Header({ guardarCambios, guardando, guardadoOk, onExportar }) {
  return (
    <div style={{ background: "#1B3A30", color: "#F6F3EC", padding: "28px 20px 22px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#C9A24B", marginBottom: 6 }}>
          Cooperativa 2020 · Nuestro Sueño
        </div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, margin: 0, fontWeight: 700 }}>
          Guardias &amp; Rotación
        </h1>
        <div style={{ fontSize: 14, color: "#CFCABF", marginTop: 4 }}>
          Comisiones, calendario de guardias y contador de horas por socio
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 11.5, color: "#C9A24B" }}>
            ● Datos compartidos: todos los que abran este link ven y editan la misma información.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={onExportar}
              style={{
                background: "#F6F3EC", color: "#1B3A30", border: "none", borderRadius: 8,
                padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              }}
            >
              Descargar historial PDF
            </button>
            <button
              onClick={guardarCambios}
              disabled={guardando}
              style={{
                background: guardadoOk ? "#4E7A5E" : "#C9A24B",
                color: "#1B3A30", border: "none", borderRadius: 8,
                padding: "6px 12px", fontSize: 12.5, fontWeight: 700,
                cursor: guardando ? "wait" : "pointer",
              }}
            >
              {guardando ? "Guardando…" : guardadoOk ? "✓ Guardado" : "💾 Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ExportarPDFModal({ registros, onCerrar }) {
  const fechas = registros.map((r) => r.fecha).sort();
  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState(fechas[0] || hoy);
  const [hasta, setHasta] = useState(fechas[fechas.length - 1] || hoy);
  const [error, setError] = useState("");

  const cantidad = registros.filter((r) => r.fecha >= desde && r.fecha <= hasta).length;

  const descargar = () => {
    if (!desde || !hasta) {
      setError("Elegí una fecha de inicio y una fecha final.");
      return;
    }
    if (desde > hasta) {
      setError("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
      return;
    }
    setError("");
    descargarHistorialPDF(registros, desde, hasta);
  };

  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed", inset: 0, background: "rgba(18, 24, 21, 0.58)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: "#F6F3EC", borderRadius: 14,
          padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.25)", color: "#242018",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 700, color: "#1B3A30" }}>
              Descargar historial PDF
            </div>
            <div style={{ fontSize: 12.5, color: "#716A5E", marginTop: 5, lineHeight: 1.45 }}>
              Elegí el período que querés incluir. Se cuentan las guardias y rotaciones asignadas entre ambas fechas, inclusive.
            </div>
          </div>
          <button onClick={onCerrar} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#716A5E" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#5A5346" }}>
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, border: "1px solid #D9D0BE", borderRadius: 8, padding: "9px 10px", fontSize: 14, background: "#fff" }}
            />
          </label>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#5A5346" }}>
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, border: "1px solid #D9D0BE", borderRadius: 8, padding: "9px 10px", fontSize: 14, background: "#fff" }}
            />
          </label>
        </div>

        <div style={{ marginTop: 14, padding: "10px 12px", background: "#EAF1EC", borderRadius: 8, fontSize: 12.5, color: "#2E5C4F" }}>
          {cantidad} registro{cantidad === 1 ? "" : "s"} dentro del período seleccionado.
        </div>
        {error && <div style={{ marginTop: 10, color: "#B5482E", fontSize: 12.5 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onCerrar} style={btnGhost}>Cancelar</button>
          <button onClick={descargar} style={btnPrimary}>Descargar PDF</button>
        </div>
      </div>
    </div>
  );
}

function NavTabs({ tab, setTab }) {
  const items = [
    { key: "calendario", label: "Calendario" },
    { key: "disponibilidad", label: "Disponibilidad" },
    { key: "miembros", label: "Socios y comisiones" },
    { key: "horas", label: "Horas de guardia" },
  ];
  return (
    <div style={{ background: "#1B3A30", borderTop: "1px solid #2C4F42" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", gap: 4, padding: "0 20px", overflowX: "auto" }}>
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            style={{
              padding: "12px 16px",
              background: tab === it.key ? "#F6F3EC" : "transparent",
              color: tab === it.key ? "#1B3A30" : "#CFCABF",
              border: "none",
              borderRadius: "8px 8px 0 0",
              fontSize: 14,
              fontWeight: tab === it.key ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tab Miembros ---------- */

function MiembrosTab({ members, addMember, updateMember, removeMember, comisiones, addComision }) {
  const [filtro, setFiltro] = useState("Todos");
  const [nuevaComisionAbierta, setNuevaComisionAbierta] = useState(false);
  const [nombreNuevaComision, setNombreNuevaComision] = useState("");
  const grupos = ["Todos", "Sin comisión", ...comisiones];
  const visibles = members.filter((m) => {
    if (filtro === "Todos") return true;
    if (filtro === "Sin comisión") return !m.comision;
    return m.comision === filtro;
  });

  const confirmarNuevaComision = () => {
    addComision(nombreNuevaComision);
    setNombreNuevaComision("");
    setNuevaComisionAbierta(false);
  };

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "#5A5346" }}>
          {members.length} socios
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={addMember} style={btnPrimary}>+ Agregar socio</button>
          <button onClick={() => setNuevaComisionAbierta(!nuevaComisionAbierta)} style={btnGold}>+ Agregar comisión</button>
        </div>
      </div>

      {nuevaComisionAbierta && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, padding: "10px 14px" }}>
          <input
            autoFocus
            placeholder="Nombre de la comisión (ej: Seguridad)"
            value={nombreNuevaComision}
            onChange={(e) => setNombreNuevaComision(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmarNuevaComision(); }}
            style={{ flex: 1, border: "1px solid #E0D9C7", borderRadius: 6, padding: "7px 10px", fontSize: 13.5 }}
          />
          <button onClick={confirmarNuevaComision} style={btnPrimary}>Agregar</button>
          <button onClick={() => { setNuevaComisionAbierta(false); setNombreNuevaComision(""); }} style={btnGhost}>Cancelar</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {grupos.map((g) => (
          <button
            key={g}
            onClick={() => setFiltro(g)}
            style={{
              padding: "6px 12px", borderRadius: 20,
              border: "1px solid " + colorComision(g),
              background: filtro === g ? colorComision(g) : "#fff",
              color: filtro === g ? "#fff" : colorComision(g),
              fontSize: 12.5, cursor: "pointer",
            }}
          >{g}</button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #E6E0D2" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 40px", padding: "10px 14px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#8A8371", borderBottom: "1px solid #E6E0D2" }}>
          <div>Nombre</div><div>Comisión</div><div></div>
        </div>
        {visibles.map((m) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 170px 40px", padding: "9px 14px", alignItems: "center", borderBottom: "1px solid #F0EBDD" }}>
            <input value={m.nombre} onChange={(e) => updateMember(m.id, { nombre: e.target.value })} style={{ border: "none", background: "transparent", fontSize: 14.5, fontWeight: 500, outline: "none" }} />
            <select
              value={m.comision || ""}
              onChange={(e) => updateMember(m.id, { comision: e.target.value || null })}
              style={{ border: "1px solid #E0D9C7", borderRadius: 6, padding: "5px 6px", fontSize: 13, color: colorComision(m.comision || "Sin comisión") }}
            >
              <option value="">Sin comisión</option>
              {comisiones.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => removeMember(m.id)} title="Quitar socio" style={{ border: "none", background: "transparent", color: "#B5482E", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "#8A8371", marginTop: 10, lineHeight: 1.5 }}>
        La comisión de cada socio se usa para agrupar las dos cajas de selección ("con comisión" / "sin comisión") en el Calendario.
      </div>
    </div>
  );
}

/* ---------- Tab Disponibilidad ---------- */

function DisponibilidadTab({ members, disponibilidad, toggleDisponibilidadMiembro, marcarTodoDisponible }) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = members.filter((m) => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontSize: 13, color: "#5A5346", marginBottom: 12, lineHeight: 1.5 }}>
        Marcá en qué turnos puede hacer guardia cada socio de forma habitual. El generador automático solo va a proponer a alguien en los turnos que tenga marcados en verde.
      </div>
      <input
        placeholder="Buscar socio…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", border: "1px solid #E0D9C7", borderRadius: 8, padding: "8px 12px", fontSize: 13.5, marginBottom: 14 }}
      />
      <div style={{ background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, overflow: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#fff", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #E6E0D2", minWidth: 160, zIndex: 1 }}>Socio</th>
              {TODOS_LOS_SLOTS.map((s) => (
                <th key={s.key} style={{ padding: "8px 6px", borderBottom: "1px solid #E6E0D2", fontWeight: 600, color: "#5A5346", minWidth: 68, textAlign: "center" }}>
                  {s.corto}
                </th>
              ))}
              <th style={{ padding: "8px 6px", borderBottom: "1px solid #E6E0D2", minWidth: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((m) => (
              <tr key={m.id}>
                <td style={{ position: "sticky", left: 0, background: "#fff", padding: "6px 10px", borderBottom: "1px solid #F0EBDD", fontWeight: 500 }}>{m.nombre}</td>
                {TODOS_LOS_SLOTS.map((s) => {
                  const disp = estaDisponible(disponibilidad, m.id, s.key);
                  return (
                    <td key={s.key} style={{ padding: "6px", borderBottom: "1px solid #F0EBDD", textAlign: "center" }}>
                      <button
                        onClick={() => toggleDisponibilidadMiembro(m.id, s.key)}
                        style={{
                          width: 26, height: 26, borderRadius: 6,
                          border: "1px solid " + (disp ? "#8FA898" : "#D9CDBB"),
                          background: disp ? "#8FA898" : "#F0EBDD",
                          color: disp ? "#fff" : "#B7AF9E",
                          cursor: "pointer", fontSize: 13,
                        }}
                        title={disp ? "Disponible" : "No disponible"}
                      >
                        {disp ? "✓" : "×"}
                      </button>
                    </td>
                  );
                })}
                <td style={{ padding: "6px", borderBottom: "1px solid #F0EBDD", whiteSpace: "nowrap" }}>
                  <button onClick={() => marcarTodoDisponible(m.id, true)} style={{ fontSize: 11, border: "none", background: "transparent", color: "#2E5C4F", cursor: "pointer" }}>todo</button>
                  {" / "}
                  <button onClick={() => marcarTodoDisponible(m.id, false)} style={{ fontSize: 11, border: "none", background: "transparent", color: "#B5482E", cursor: "pointer" }}>nada</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Tab Calendario ---------- */

function CalendarioTab({
  weeks, members, memberById, activeWeek, setActiveWeek,
  addWeek, removeWeek, setSlotAssignment, generarSemana, revertirSemana, puedeRevertir,
  irASemanaActual, editarFechaSemana, horasHasta, toggleDisponibilidadSemana, toggleHorarioAlterno, disponibilidad,
  addFreeAssign, removeFreeAssign, seleccionado, setSeleccionado,
}) {
  const [diaAbierto, setDiaAbierto] = useState(null);
  const week = weeks.find((w) => w.id === activeWeek);
  const totalsHasta = week ? horasHasta(week.id) : {};

  const asignadosPorDia = {};
  if (week) {
    DIAS_GUARDIA.forEach((dia) => {
      const set = new Set();
      SLOTS.filter((s) => s.dia === dia).forEach((s) => (week.slots[s.key] || []).forEach((id) => set.add(id)));
      asignadosPorDia[dia] = set;
    });
  }

  const conComision = members.filter((m) => m.comision);
  const sinComision = members.filter((m) => !m.comision);

  const handleDropDia = (dia) => (e) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData("text/plain");
    if (memberId) addFreeAssign(week.id, dia, memberId);
  };

  const handleClickDia = (dia) => () => {
    if (seleccionado) { addFreeAssign(week.id, dia, seleccionado); setSeleccionado(null); }
  };

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {weeks.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveWeek(w.id)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #1B3A30",
              background: activeWeek === w.id ? "#1B3A30" : "#fff",
              color: activeWeek === w.id ? "#fff" : "#1B3A30",
              fontSize: 13, cursor: "pointer",
            }}
          >{formatearRango(w.start)}</button>
        ))}
        <button onClick={addWeek} style={{ ...btnGhost, borderStyle: "dashed" }}>+ Semana</button>
        <button onClick={irASemanaActual} style={btnGold}>Semana actual</button>
      </div>

      {week && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 19, color: "#1B3A30" }}>
                Semana del {formatearRango(week.start)}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#8A8371", cursor: "pointer" }}>
                ✎ corregir fecha
                <input
                  type="date"
                  defaultValue={week.start}
                  onChange={(e) => editarFechaSemana(week.id, e.target.value)}
                  style={{ border: "1px solid #E0D9C7", borderRadius: 6, padding: "2px 4px", fontSize: 12 }}
                  title="Elegí cualquier día: la semana se ajusta al lunes correspondiente"
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => generarSemana(week.id)} style={btnPrimary}>Generar automáticamente</button>
              <button
                onClick={() => revertirSemana(week.id)}
                disabled={!puedeRevertir(week.id)}
                style={{ ...btnGhost, opacity: puedeRevertir(week.id) ? 1 : 0.4, cursor: puedeRevertir(week.id) ? "pointer" : "not-allowed" }}
                title="Volver a la asignación anterior a la última generación automática"
              >↺ Revertir</button>
              {weeks.length > 1 && <button onClick={() => removeWeek(week.id)} style={btnGhostRed}>Eliminar semana</button>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
            <SourceBox titulo="Socios de comisión" color="#2E5C4F" lista={conComision} seleccionado={seleccionado} setSeleccionado={setSeleccionado} />
            <SourceBox titulo="Socios sin comisión" color="#5A5346" lista={sinComision} seleccionado={seleccionado} setSeleccionado={setSeleccionado} />
          </div>
          <div style={{ fontSize: 12, color: "#8A8371", marginBottom: 18 }}>
            Tocá un nombre para seleccionarlo (queda resaltado en dorado) y después tocá el día o turno donde va, o arrastralo directamente.
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {DIAS_LIBRES.map((dia) => (
              <div key={dia} onDragOver={(e) => e.preventDefault()} onDrop={handleDropDia(dia)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontWeight: 700, color: "#1B3A30", fontSize: 15 }}>{dia}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12.5, color: "#8A8371" }}>{horarioLibreDia(week, dia)} hs</div>
                    <button
                      onClick={() => toggleHorarioAlterno(week.id, dia)}
                      style={{ ...btnGhost, padding: "5px 10px", fontSize: 12 }}
                      title="Cambia el horario solo para este día de esta semana"
                    >
                      {week.horarioAlterno && week.horarioAlterno[dia] ? "Volver a 18-22" : "Usar 17-22 esta vez"}
                    </button>
                    {seleccionado && <button onClick={handleClickDia(dia)} style={{ ...btnGold, padding: "5px 10px", fontSize: 12 }}>Soltar acá</button>}
                    <button onClick={() => setDiaAbierto(diaAbierto === dia ? null : dia)} style={{ ...btnGhost, padding: "5px 10px", fontSize: 12 }}>
                      {diaAbierto === dia ? "Cerrar excepciones" : "Marcar ausencias de esta semana"}
                    </button>
                  </div>
                </div>
                {diaAbierto === dia && (
                  <DisponibilidadDiaSemana
                    dia={dia}
                    members={members}
                    unavailable={(week.unavailable && week.unavailable[dia]) || []}
                    onToggle={(memberId) => toggleDisponibilidadSemana(week.id, dia, memberId)}
                  />
                )}
                <div style={{ background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, padding: "12px 16px" }}>
                  <FreeAssignZone ids={(week.freeAssign && week.freeAssign[dia]) || []} memberById={memberById} onRemove={(id) => removeFreeAssign(week.id, dia, id)} />
                </div>
              </div>
            ))}

            {DIAS_GUARDIA.map((dia) => (
              <div key={dia}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: "#1B3A30", fontSize: 15 }}>{dia}</div>
                  <button onClick={() => setDiaAbierto(diaAbierto === dia ? null : dia)} style={{ ...btnGhost, padding: "5px 10px", fontSize: 12 }}>
                    {diaAbierto === dia ? "Cerrar excepciones" : "Marcar ausencias de esta semana"}
                  </button>
                </div>

                {diaAbierto === dia && (
                  <DisponibilidadDiaSemana
                    dia={dia}
                    members={members}
                    unavailable={(week.unavailable && week.unavailable[dia]) || []}
                    onToggle={(memberId) => toggleDisponibilidadSemana(week.id, dia, memberId)}
                  />
                )}

                <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                  {SLOTS.filter((s) => s.dia === dia).map((slot) => (
                    <TurnoDropZone
                      key={slot.key}
                      slot={slot}
                      assigned={week.slots[slot.key] || []}
                      asignadosDia={asignadosPorDia[dia] || new Set()}
                      noDisponibles={(week.unavailable && week.unavailable[dia]) || []}
                      disponibilidad={disponibilidad}
                      totalsHasta={totalsHasta}
                      memberById={memberById}
                      onChange={(ids) => setSlotAssignment(week.id, slot.key, ids)}
                      seleccionado={seleccionado}
                      setSeleccionado={setSeleccionado}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SourceBox({ titulo, color, lista, seleccionado, setSeleccionado }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontWeight: 700, color, fontSize: 13.5, marginBottom: 8 }}>{titulo} ({lista.length})</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 160, overflowY: "auto" }}>
        {lista.map((m) => {
          const activo = seleccionado === m.id;
          return (
            <div
              key={m.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", m.id)}
              onClick={() => setSeleccionado(activo ? null : m.id)}
              style={{
                border: "1px solid " + (activo ? "#C9A24B" : "#E0D9C7"),
                background: activo ? "#FBF6E7" : "#F6F3EC",
                borderRadius: 16, padding: "4px 10px", fontSize: 12, cursor: "grab", userSelect: "none",
              }}
              title={m.comision || ""}
            >{m.nombre}</div>
          );
        })}
      </div>
    </div>
  );
}

function FreeAssignZone({ ids, memberById, onRemove }) {
  if (!ids.length) return <div style={{ fontSize: 12, color: "#B7AF9E", fontStyle: "italic" }}>Sin nadie asignado todavía</div>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {ids.map((id) => {
        const m = memberById[id];
        if (!m) return null;
        return (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#EAF1EC", border: "1px solid #8FA898", borderRadius: 16, padding: "3px 6px 3px 10px", fontSize: 12, color: "#2E5C4F" }}>
            {m.nombre}
            <button onClick={(e) => { e.stopPropagation(); onRemove(id); }} style={{ border: "none", background: "transparent", color: "#5A8271", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

function DisponibilidadDiaSemana({ dia, members, unavailable, onToggle }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, padding: "12px 14px", marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: "#8A8371", marginBottom: 8 }}>
        Excepción solo para esta semana: tocá a un socio para marcarlo ausente el {dia.toLowerCase()} (además de su disponibilidad habitual de la pestaña Disponibilidad).
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {members.map((m) => {
          const no = unavailable.includes(m.id);
          return (
            <button key={m.id} onClick={() => onToggle(m.id)} style={{
              border: "1px solid " + (no ? "#C9BFA9" : "#8FA898"),
              background: no ? "#EDE8DB" : "#EAF1EC",
              color: no ? "#A69F8C" : "#2E5C4F",
              borderRadius: 16, padding: "4px 10px", fontSize: 12, cursor: "pointer",
              textDecoration: no ? "line-through" : "none",
            }}>{m.nombre}</button>
          );
        })}
      </div>
    </div>
  );
}

function TurnoDropZone({ slot, assigned, asignadosDia, noDisponibles, disponibilidad, totalsHasta, memberById, onChange, seleccionado, setSeleccionado }) {
  const puedeAgregar = (memberId) => {
    if (!memberId) return false;
    if (assigned.includes(memberId)) return false;
    if (noDisponibles.includes(memberId)) return false;
    if (!estaDisponible(disponibilidad, memberId, slot.key)) return false;
    if (asignadosDia.has(memberId)) return false;
    return true;
  };

  const agregar = (memberId) => {
    if (puedeAgregar(memberId)) onChange([...assigned, memberId]);
  };

  const quitar = (memberId) => onChange(assigned.filter((id) => id !== memberId));

  const handleDrop = (e) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData("text/plain");
    agregar(memberId);
  };

  const handleClickZone = () => {
    if (seleccionado) {
      agregar(seleccionado);
      setSeleccionado(null);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={handleClickZone}
      style={{
        background: "#fff",
        border: "1px solid " + (seleccionado && puedeAgregar(seleccionado) ? "#C9A24B" : "#E6E0D2"),
        borderRadius: 10, padding: "12px 16px",
        cursor: seleccionado ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, color: "#1B3A30", fontSize: 13.5 }}>{slot.horario} hs</div>
        <div style={{ fontSize: 12.5, color: assigned.length >= 3 ? "#8FA898" : "#8A8371" }}>{assigned.length} asignados · sugerido 3 · {slot.horas}hs c/u</div>
      </div>
      {assigned.length === 0 ? (
        <div style={{ fontSize: 12, color: "#B7AF9E", fontStyle: "italic" }}>Arrastrá o seleccioná socios acá (sin límite, sugerido 3)</div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {assigned.map((id) => {
            const m = memberById[id];
            if (!m) return null;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#EAF1EC", border: "1px solid #8FA898", borderRadius: 16, padding: "3px 6px 3px 10px", fontSize: 12, color: "#2E5C4F" }}>
                {m.nombre} <span style={{ color: "#8FA898" }}>({totalsHasta[id]?.horas || 0}hs)</span>
                <button onClick={(e) => { e.stopPropagation(); quitar(id); }} style={{ border: "none", background: "transparent", color: "#5A8271", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Tab Horas ---------- */

function HorasTab({ members, horasTotales }) {
  const rows = members.map((m) => ({ ...m, horas: horasTotales[m.id]?.horas || 0, turnos: horasTotales[m.id]?.turnos || 0 })).sort((a, b) => a.horas - b.horas);
  const maxHoras = Math.max(1, ...rows.map((r) => r.horas));
  const promedio = rows.reduce((s, r) => s + r.horas, 0) / (rows.length || 1);

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Promedio por socio" value={`${promedio.toFixed(1)} hs`} />
        <StatCard label="Total de socios" value={rows.length} />
        <StatCard label="Horas asignadas" value={`${rows.reduce((s, r) => s + r.horas, 0)} hs`} />
      </div>
      <div style={{ fontSize: 12.5, color: "#8A8371", marginBottom: 10 }}>
        Ordenados de menos a más horas. Suma turnos de guardia y asignaciones manuales por día, en todas las semanas cargadas.
      </div>
      <div style={{ background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, padding: "10px 16px" }}>
        {rows.map((r) => {
          const pct = Math.max(4, (r.horas / maxHoras) * 100);
          const debajo = r.horas < promedio;
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "170px 1fr 70px", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F0EBDD" }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nombre}</div>
              <div style={{ background: "#F0EBDD", borderRadius: 6, height: 12, position: "relative" }}>
                <div style={{ width: pct + "%", height: "100%", borderRadius: 6, background: debajo ? "#C9A24B" : "#8FA898" }} />
              </div>
              <div style={{ fontSize: 13, color: "#5A5346", textAlign: "right" }}>{r.horas}hs · {r.turnos}t</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E6E0D2", borderRadius: 10, padding: "12px 18px", minWidth: 140 }}>
      <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#8A8371" }}>{label}</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 24, color: "#1B3A30", marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ---------- estilos botones ---------- */

const btnPrimary = { background: "#1B3A30", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
const btnGold = { background: "#C9A24B", color: "#1B3A30", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const btnGhost = { background: "#fff", color: "#1B3A30", border: "1px solid #1B3A30", borderRadius: 8, padding: "8px 14px", fontSize: 13.5, cursor: "pointer" };
const btnGhostRed = { ...btnGhost, color: "#B5482E", border: "1px solid #D9B7AC" };
