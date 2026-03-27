/**
 * gestion-vueltas.js - Gestión de Notas, Extras y Auditoría Post-Jornada
 */
import { actualizarRegistro, obtenerRegistroPorId } from '../firebase/db-operations.js';
import { cerrarCualquierModal } from '../utils/helpers.js';
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
                placeholder="${jornadaCerrada ? 'Agregue aquí un reclamo o nota post-cierre...' : 'Escribe aquí notas de la jornada...'}"
                style="width:100%; border:1px solid #ccc; border-radius:8px; padding:10px; font-family:inherit;">${datos.observaciones || ''}</textarea>
            
            <div class="banner-extra" style="background:#fef3c7; border:1px solid #f59e0b; padding:15px; border-radius:10px; ${jornadaCerrada ? 'opacity:0.6; pointer-events:none;' : ''}">
                <label style="display:flex; align-items:center; gap:12px; font-weight:800; color:#92400e; cursor:${jornadaCerrada ? 'not-allowed' : 'pointer'};">
                    <input type="checkbox" id="modal-extra" ${datos.vueltasTotales >= 4 ? 'checked' : ''} 
                        ${jornadaCerrada ? 'disabled' : ''}
                        style="transform:scale(1.5);">
                    MARCAR COMO VUELTA EXTRA
                </label>
                <p style="font-size:0.75rem; margin-top:8px; color: #92400e;">
                    * ${jornadaCerrada ? 'No se pueden modificar vueltas en jornada cerrada.' : 'Las vueltas extras computan en los indicadores.'}
                </p>
            </div>
        </div>
    `;
    
    // Bloqueo del botón de finalizar unidad individual si la jornada general ya cerró
    const btnFinalizarIndiv = document.getElementById('btn-finalizar-unidad');
    if (btnFinalizarIndiv) {
        if (jornadaCerrada) {
            btnFinalizarIndiv.style.display = "none"; // Desaparece para evitar errores
        } else {
            btnFinalizarIndiv.style.display = "block";
        }
    }

    modal.showModal();
};

/**
 * Lógica del Botón: Finalizar Jornada de esta Unidad Específica
 */
document.getElementById('btn-finalizar-unidad').onclick = async () => {
    if (jornadaCerrada) return; // Doble validación de seguridad

    const idUnidad = document.getElementById('modal-id-display').innerText;
    if (confirm(`¿Finalizar jornada para la unidad ${idUnidad}? No podrá cargar más vueltas hoy.`)) {
        try {
            await actualizarRegistro(unidadActualId, { 
                finalizada: true,
                observaciones: "Jornada finalizada por el operador."
            });
            cerrarCualquierModal();
        } catch (error) {
            console.error("Error:", error);
        }
    }
};

/**
 * Lógica del Botón: Guardar Cambios (MODO AUDITORÍA HABILITADO)
 */
document.getElementById('btn-save-modal').onclick = async () => {
    const obsInput = document.getElementById('modal-obs');
    const esExtraCheckbox = document.getElementById('modal-extra');
    const esExtraValue = esExtraCheckbox.checked;
    
    // Obtenemos datos actuales para comparar y generar el log
    const datosActuales = await obtenerRegistroPorId(unidadActualId);
    const logNotas = datosActuales.logNotas || [];

    // Verificación de integridad logística si la jornada está cerrada
    if (jornadaCerrada) {
        const yaEraExtra = datosActuales.vueltasTotales >= 4;
        if (esExtraValue !== yaEraExtra) {
            alert("Operación denegada: La jornada logística está cerrada. Solo se permite editar observaciones.");
            return;
        }
    }

    // Preparamos el objeto de actualización
    const updates = { 
        observaciones: obsInput.value.trim() 
    };
    
    // Si hubo cambio en el texto, registramos en el log
    if (obsInput.value.trim() !== (datosActuales.observaciones || "")) {
        logNotas.push({
            fechaLog: new Date().toLocaleString(),
            nota: obsInput.value.trim(),
            estadoJornada: jornadaCerrada ? "POST-CIERRE" : "EN CURSO"
        });
        updates.logNotas = logNotas;
    }

    // Solo permitimos modificar vueltas totales si la jornada está ABIERTA
    if (!jornadaCerrada) {
        if (esExtraValue && datosActuales.vueltasTotales < 4) {
            updates.vueltasTotales = 4;
        } else if (!esExtraValue && datosActuales.vueltasTotales >= 4) {
            // Si el usuario desmarca extra, vuelve a su conteo real de bandas
            updates.vueltasTotales = datosActuales.detalleVueltas?.length || 0;
        }
    }

    try {
        await actualizarRegistro(unidadActualId, updates);
        cerrarCualquierModal();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar los cambios.");
    }
};

document.getElementById('btn-cancelar-alta')?.addEventListener('click', cerrarCualquierModal);