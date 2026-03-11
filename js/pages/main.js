/**
 * main.js - Controller del Dashboard con Bloqueo de Jornada
 */
import { db } from '../firebase/firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { obtenerRegistrosPorFecha, registrarUnidadEnJornada } from '../firebase/db-operations.js';
import { renderizarUnidades } from '../modules/ui-render.js';
import { buscarUnidadGlobal } from '../modules/logistics-logic.js';

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

    // Vincular el botón de Finalizar Jornada del Header
    const btnFinalizar = document.querySelector('.btn-finish-day') || document.querySelector('.btn-finish');
    if (btnFinalizar) {
        btnFinalizar.onclick = () => abrirModalCierre();
    }

    inicializarSuscripcion();
});

async function inicializarSuscripcion() {
    // 1. Verificamos si el día seleccionado ya está cerrado
    await verificarEstadoDia(fechaSeleccionada);

    // 2. Suscripción en tiempo real a las unidades
    obtenerRegistrosPorFecha(fechaSeleccionada, (datos) => {
        estadoFlota = datos;
        actualizarDashboard();
    });
}

async function verificarEstadoDia(fecha) {
    try {
        const docRef = doc(db, "cierres_jornada", fecha);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            jornadaCerrada = true;
            document.body.classList.add('jornada-bloqueada');
            console.warn("JORNADA BLOQUEADA: Los datos son de solo lectura.");
        } else {
            jornadaCerrada = false;
            document.body.classList.remove('jornada-bloqueada');
        }
    } catch (error) {
        console.error("Error al verificar estado del día:", error);
    }
}

function actualizarDashboard() {
    const totalUnidades = estadoFlota.length;
    const unidadesConExtra = estadoFlota.filter(u => u.vueltasTotales >= 4).length;
    const pendientes = estadoFlota.filter(u => u.vueltasTotales < 3 && u.horarioIngreso !== 'Ausente').length;

    // Actualizamos KPIs en el Header
    const kpiRuta = document.getElementById('kpi-ruta');
    const kpiExtras = document.getElementById('kpi-extras');
    const kpiLibres = document.getElementById('kpi-libres');

    if (kpiRuta) kpiRuta.innerText = totalUnidades;
    if (kpiExtras) kpiExtras.innerText = unidadesConExtra;
    if (kpiLibres) kpiLibres.innerText = pendientes;
    
    renderizarUnidades(estadoFlota);
}

// Vinculamos el Enter al input dinámico de agregar unidad
window.configurarInputNuevo = function() {
    const input = document.getElementById('input-nueva-unidad');
    if (!input) return;

    input.onkeypress = async (e) => {
        if (e.key === 'Enter') {
            if (jornadaCerrada) {
                alert("Operación denegada: La jornada del día seleccionado ya ha sido finalizada.");
                e.target.value = '';
                return;
            }
            const id = e.target.value.trim();
            if (!id) return;
            
            const unidadEncontrada = await buscarUnidadGlobal(id);
            if (unidadEncontrada) {
                await registrarUnidadEnJornada(unidadEncontrada, fechaSeleccionada);
            }
            e.target.value = '';
        }
    };
};

// --- LÓGICA DE CIERRE (MODAL) ---

// Actualiza esta función en tu main.js
function abrirModalCierre() {
    const modal = document.getElementById('modal-cierre-contenedor'); // ID actualizado
    if (modal) {
        document.getElementById('fecha-cierre-display').innerText = fechaSeleccionada;
        modal.classList.add('active');
    }
}

// Función global para cerrar el modal (vinculada al botón cancelar)
window.cerrarModalCierre = function() {
    const modal = document.getElementById('modal-cierre-contenedor'); // ID actualizado
    if (modal) modal.classList.remove('active');
};

const btnConfirmar = document.getElementById('btn-confirmar-cierre');
if (btnConfirmar) {
    btnConfirmar.onclick = async () => {
        const obsField = document.getElementById('obs-cierre-final');
        const observacion = obsField ? obsField.value : "";

        try {
            await setDoc(doc(db, "cierres_jornada", fechaSeleccionada), {
                fecha: fechaSeleccionada,
                observacionGeneral: observacion,
                cerradoPor: "Administrador",
                timestamp: new Date()
            });

            alert("Jornada finalizada con éxito. El panel ahora es de solo lectura.");
            window.cerrarModalCierre();
            location.reload(); 
        } catch (error) {
            console.error("Error al cerrar jornada:", error);
            alert("Error crítico al cerrar jornada. Revisa la conexión.");
        }
    };
}