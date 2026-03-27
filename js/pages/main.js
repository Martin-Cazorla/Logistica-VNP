/**
 * main.js - Controller del Dashboard
 * Refactorizado para incluir reapertura de jornada y mejor manejo de UI.
 */
import { db } from '../firebase/firebase-config.js';
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { obtenerRegistrosPorFecha, registrarUnidadEnJornada } from '../firebase/db-operations.js';
import { renderizarUnidades } from '../modules/ui-render.js';
import { buscarUnidadGlobal } from '../modules/logistics-logic.js';
import { cerrarCualquierModal } from '../utils/helpers.js';

let estadoFlota = [];
let fechaSeleccionada = new Date().toISOString().split('T')[0];
let jornadaCerrada = false;

document.addEventListener('DOMContentLoaded', () => {
    const inputFecha = document.getElementById('fecha-operacion');
    if (inputFecha) {
        inputFecha.value = fechaSeleccionada;
        inputFecha.onchange = (e) => {
            fechaSeleccionada = e.target.value;
            inicializarSuscripcion();
        };
    }

    const btnAccion = document.getElementById('btn-accion-jornada');
    if (btnAccion) {
        btnAccion.onclick = () => {
            // Si la jornada está cerrada, este botón actúa como Reabrir
            if (jornadaCerrada) {
                reabrirJornadaAdmin();
            } else {
                abrirModalCierre();
            }
        };
    }

    // Listener para cancelar cierre (Uso del método close() nativo de <dialog>)
    document.getElementById('btn-cancelar-cierre').onclick = () => {
        document.getElementById('modal-cierre-contenedor').close();
    };

    inicializarSuscripcion();
});

async function inicializarSuscripcion() {
    await verificarEstadoDia(fechaSeleccionada);
    obtenerRegistrosPorFecha(fechaSeleccionada, (datos) => {
        estadoFlota = datos;
        actualizarDashboard();
    });
}

/**
 * Verifica si existe un registro de cierre para la fecha
 */
async function verificarEstadoDia(fecha) {
    try {
        const docSnap = await getDoc(doc(db, "cierres_jornada", fecha));
        jornadaCerrada = docSnap.exists();
        
        const btnAccion = document.getElementById('btn-accion-jornada');
        
        // Actualización Visual de la UI
        document.body.classList.toggle('jornada-bloqueada', jornadaCerrada);
        
        if (jornadaCerrada) {
            btnAccion.innerText = "REABRIR JORNADA";
            btnAccion.style.background = "#ef4444"; // Color rojo para advertir acción crítica
        } else {
            btnAccion.innerText = "FINALIZAR JORNADA";
            btnAccion.style.background = ""; // Color original de CSS
        }
    } catch (error) {
        console.error("Error al verificar estado:", error);
    }
}

/**
 * Lógica para eliminar el bloqueo de la jornada (Solución al error del colaborador)
 */
async function reabrirJornadaAdmin() {
    const confirmacion = confirm(`ATENCIÓN: Vas a reabrir la jornada del ${fechaSeleccionada}. Esto permitirá editar nuevamente todos los datos. ¿Continuar?`);
    
    if (confirmacion) {
        try {
            await deleteDoc(doc(db, "cierres_jornada", fechaSeleccionada));
            alert("Jornada reabierta. Ahora puedes editar la planilla.");
            // Refrescamos estado sin recargar la página completa
            await inicializarSuscripcion();
        } catch (error) {
            console.error("Error al reabrir:", error);
            alert("Error de permisos al intentar reabrir.");
        }
    }
}

function actualizarDashboard() {
    const extras = estadoFlota.filter(u => u.vueltasTotales >= 4).length;
    const pendientes = estadoFlota.filter(u => u.vueltasTotales < 3 && u.horarioIngreso !== 'Ausente' && !u.finalizada).length;

    if (document.getElementById('kpi-ruta')) document.getElementById('kpi-ruta').innerText = estadoFlota.length;
    if (document.getElementById('kpi-extras')) document.getElementById('kpi-extras').innerText = extras;
    if (document.getElementById('kpi-libres')) document.getElementById('kpi-libres').innerText = pendientes;
    
    renderizarUnidades(estadoFlota);
}

window.configurarInputNuevo = function() {
    const input = document.getElementById('input-nueva-unidad');
    if (!input) return;

    input.onkeypress = async (e) => {
        if (e.key === 'Enter') {
            if (jornadaCerrada) {
                alert("No se pueden AGREGAR unidades a una jornada cerrada.");
                e.target.value = '';
                return;
            }

            const id = e.target.value.trim();
            if (!id) return;

            const unidad = await buscarUnidadGlobal(id);
            if (unidad) {
                await registrarUnidadEnJornada(unidad, fechaSeleccionada);
            }
            e.target.value = '';
        }
    };
};

function abrirModalCierre() {
    const modal = document.getElementById('modal-cierre-contenedor');
    if (modal) {
        document.getElementById('fecha-cierre-display').innerText = fechaSeleccionada;
        modal.showModal(); // Usamos API nativa de <dialog>
    }
}

document.getElementById('btn-confirmar-cierre').onclick = async () => {
    try {
        await setDoc(doc(db, "cierres_jornada", fechaSeleccionada), {
            fecha: fechaSeleccionada,
            observacionGeneral: document.getElementById('obs-cierre-final').value,
            timestamp: new Date()
        });
        alert("Jornada finalizada correctamente.");
        document.getElementById('modal-cierre-contenedor').close();
        await inicializarSuscripcion(); // Actualiza la UI para mostrar bloqueo
    } catch (error) {
        console.error(error);
        alert("Error al cerrar jornada.");
    }
};

export { jornadaCerrada };