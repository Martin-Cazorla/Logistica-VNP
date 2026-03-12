/**
 * gestion-vueltas.js - Gestión de Notas, Extras y Finalización Individual
 * Refactorizado para permitir auditoría en jornadas cerradas.
 */
import { actualizarRegistro, obtenerRegistroPorId } from '../firebase/db-operations.js';
import { cerrarCualquierModal } from '../utils/helpers.js';
// Importamos el estado de la jornada desde el controlador principal
import { jornadaCerrada } from '../pages/main.js';

const modal = document.getElementById('modal-gestion');
const container = document.getElementById('vueltas-detalle-container');
let unidadActualId = null;

/**
 * Abre el modal y carga los datos actuales de la unidad seleccionada
 */
window.abrirGestionVueltas = async function(idFirebase) {
    unidadActualId = idFirebase;
    const datos = await obtenerRegistroPorId(idFirebase);
    if (!datos) return;

    document.getElementById('modal-id-display').innerText = datos.unidad;
    
    // Inyectamos el contenido dinámico del modal
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:15px; padding:10px;">
            <label style="font-weight: 700;">Observaciones / Reclamos:</label>
            <textarea id="modal-obs" rows="4" 
                placeholder="Escribe aquí notas de la jornada o reclamos posteriores..."
                style="width:100%; border:1px solid #ccc; border-radius:8px; padding:10px; font-family:inherit;">${datos.observaciones || ''}</textarea>
            
            <div class="banner-extra" style="background:#fef3c7; border:1px solid #f59e0b; padding:15px; border-radius:10px;">
                <label style="display:flex; align-items:center; gap:12px; font-weight:800; color:#92400e; cursor:pointer;">
                    <input type="checkbox" id="modal-extra" ${datos.vueltasTotales >= 4 ? 'checked' : ''} 
                        style="transform:scale(1.5);">
                    MARCAR COMO VUELTA EXTRA
                </label>
                <p style="font-size:0.75rem; margin-top:8px; color: #92400e;">
                    * Las vueltas extras marcan la unidad como "Cumplida" y se computan en los indicadores.
                </p>
            </div>
        </div>
    `;
    
    // --- CORRECCIÓN SENIOR: Lógica de bloqueo visual si la jornada está cerrada ---
    if (jornadaCerrada) {
        const txt = document.getElementById('modal-obs');
        txt.style.borderColor = "#f59e0b";
        txt.placeholder = "Jornada cerrada: Solo se permiten auditorías de observaciones/reclamos.";

        // Bloqueamos el botón de finalizar unidad individual
        const btnFinalizarIndiv = document.getElementById('btn-finalizar-unidad');
        if (btnFinalizarIndiv) {
            btnFinalizarIndiv.style.opacity = "0.5";
            btnFinalizarIndiv.style.pointerEvents = "none";
        }

        // Deshabilitar el checkbox de extra para evitar cambios accidentales
        const checkExtra = document.getElementById('modal-extra');
        if (checkExtra) {
            checkExtra.disabled = true;
            checkExtra.parentElement.style.cursor = "not-allowed";
            checkExtra.parentElement.style.opacity = "0.7";
        }
    }

    modal.showModal();
};

/**
 * Lógica del Botón: Finalizar Jornada de esta Unidad Específica
 */
document.getElementById('btn-finalizar-unidad').onclick = async () => {
    const idUnidad = document.getElementById('modal-id-display').innerText;
    
    // Bloqueo de seguridad preventivo
    if (jornadaCerrada) {
        alert("La jornada general ya está cerrada.");
        return;
    }

    if (confirm(`¿Finalizar jornada para la unidad ${idUnidad}? No podrá cargar más vueltas hoy.`)) {
        try {
            await actualizarRegistro(unidadActualId, { 
                finalizada: true,
                observaciones: "Jornada finalizada por falta de pedidos o retiro anticipado."
            });
            cerrarCualquierModal();
        } catch (error) {
            console.error("Error al finalizar unidad:", error);
            alert("Error al intentar finalizar la unidad.");
        }
    }
};

/**
 * Lógica del Botón: Guardar Cambios
 */
document.getElementById('btn-save-modal').onclick = async () => {
    const obsInput = document.getElementById('modal-obs');
    const esExtra = document.getElementById('modal-extra').checked;
    
    // Si la jornada está cerrada, solo permitimos guardar si NO se intentó cambiar el estado de EXTRA
    if (jornadaCerrada) {
        const datosPrevios = await obtenerRegistroPorId(unidadActualId);
        const yaEraExtra = datosPrevios.vueltasTotales >= 4;

        if (esExtra !== yaEraExtra) {
            alert("La jornada está cerrada. Solo podés modificar el texto de observaciones.");
            return;
        }
    }

    const updates = { 
        observaciones: obsInput.value.trim() 
    };
    
    // Solo permitimos subir las vueltas a 4 si la jornada está abierta
    if (!jornadaCerrada && esExtra) {
        updates.vueltasTotales = 4;
    }

    try {
        await actualizarRegistro(unidadActualId, updates);
        cerrarCualquierModal();
    } catch (error) {
        console.error("Error al guardar cambios:", error);
        alert("No se pudieron guardar los cambios.");
    }
};

// Vinculamos el cierre al helper centralizado
document.getElementById('close-modal').onclick = () => cerrarCualquierModal();