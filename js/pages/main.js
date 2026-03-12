/**
 * main.js - Controller del Dashboard
 */
import { db } from '../firebase/firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

    const btnFinalizar = document.querySelector('.btn-finish');
    if (btnFinalizar) btnFinalizar.onclick = () => abrirModalCierre();

    inicializarSuscripcion();
});

async function inicializarSuscripcion() {
    await verificarEstadoDia(fechaSeleccionada);
    obtenerRegistrosPorFecha(fechaSeleccionada, (datos) => {
        estadoFlota = datos;
        actualizarDashboard();
    });
}

async function verificarEstadoDia(fecha) {
    try {
        const docSnap = await getDoc(doc(db, "cierres_jornada", fecha));
        jornadaCerrada = docSnap.exists();
        // Agregamos clase al body para cambios visuales en CSS
        document.body.classList.toggle('jornada-bloqueada', jornadaCerrada);
    } catch (error) {
        console.error("Error al verificar estado:", error);
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

// CONFIGURACIÓN DEL INPUT (REFACTORIZADO)
window.configurarInputNuevo = function() {
    const input = document.getElementById('input-nueva-unidad');
    if (!input) return;

    input.onkeypress = async (e) => {
        if (e.key === 'Enter') {
            // CORRECCIÓN SOLICITADA: Bloqueo de adición en jornada cerrada
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
        modal.classList.add('active');
    }
}

document.getElementById('btn-confirmar-cierre').onclick = async () => {
    try {
        await setDoc(doc(db, "cierres_jornada", fechaSeleccionada), {
            fecha: fechaSeleccionada,
            observacionGeneral: document.getElementById('obs-cierre-final').value,
            timestamp: new Date()
        });
        alert("Jornada finalizada.");
        cerrarCualquierModal();
        location.reload(); 
    } catch (error) {
        console.error(error);
        alert("Error al cerrar jornada.");
    }
};

// Exportamos jornadaCerrada para que otros módulos (como gestión-vueltas) puedan consultarla
export { jornadaCerrada };