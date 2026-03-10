/**
 * main.js - Controller del Dashboard con Histórico e Indicadores
 */
import { obtenerRegistrosPorFecha, registrarUnidadEnJornada } from '../firebase/db-operations.js';
import { renderizarUnidades } from '../modules/ui-render.js';
import { buscarUnidadGlobal } from '../modules/logistics-logic.js';

let estadoFlota = [];
let fechaSeleccionada = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    const inputFecha = document.getElementById('fecha-operacion');
    inputFecha.value = fechaSeleccionada;

    // Escuchar cambio de fecha para ver historial o cargar días previos
    inputFecha.onchange = (e) => {
        fechaSeleccionada = e.target.value;
        inicializarSuscripcion();
    };

    inicializarSuscripcion();
});

function inicializarSuscripcion() {
    // Suscripción en tiempo real filtrada por la fecha elegida
    obtenerRegistrosPorFecha(fechaSeleccionada, (datos) => {
        estadoFlota = datos;
        actualizarDashboard();
    });
}

function actualizarDashboard() {
    const totalUnidades = estadoFlota.length;
    
    // 1. Unidades que tienen el check de EXTRA o más de 3 vueltas
    const unidadesConExtra = estadoFlota.filter(u => u.vueltasTotales >= 4).length;
    
    // 2. Pendientes (Unidades que no son ausentes y tienen menos de 3 vueltas)
    const pendientes = estadoFlota.filter(u => u.vueltasTotales < 3 && u.horarioIngreso !== 'Ausente').length;

    // Actualizamos el Header
    document.getElementById('kpi-ruta').innerText = totalUnidades;
    // Usaremos un nuevo ID para el contador de extras si lo deseas, 
    // o puedes reemplazar el de 'pendientes'
    const kpiExtras = document.getElementById('kpi-extras');
    if (kpiExtras) kpiExtras.innerText = unidadesConExtra;
    
    document.getElementById('kpi-libres').innerText = pendientes;
    
    renderizarUnidades(estadoFlota);
}

// Vinculamos el Enter al input dinámico (llamado desde ui-render.js)
window.configurarInputNuevo = function() {
    const input = document.getElementById('input-nueva-unidad');
    if (!input) return;

    input.onkeypress = async (e) => {
        if (e.key === 'Enter') {
            const id = e.target.value.trim();
            if (!id) return;
            
            const unidadEncontrada = await buscarUnidadGlobal(id);
            if (unidadEncontrada) {
                // Pasamos la fecha seleccionada para que se guarde en el día correcto
                await registrarUnidadEnJornada(unidadEncontrada, fechaSeleccionada);
            }
            e.target.value = '';
        }
    };
};