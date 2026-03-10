/**
 * gestion-vueltas.js - Solo Notas y Extra
 */
import { actualizarRegistro, obtenerRegistroPorId } from '../firebase/db-operations.js';

const modal = document.getElementById('modal-gestion');
const container = document.getElementById('vueltas-detalle-container');
let unidadActualId = null;

window.abrirGestionVueltas = async function(idFirebase) {
    unidadActualId = idFirebase;
    const datos = await obtenerRegistroPorId(idFirebase);
    if (!datos) return;

    document.getElementById('modal-id-display').innerText = datos.unidad;
    
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:15px; padding:10px;">
            <label>Observaciones:</label>
            <textarea id="modal-obs" rows="4" style="width:100%; border:1px solid #ccc; border-radius:4px; padding:8px;">${datos.observaciones || ''}</textarea>
            
            <div style="background:#fef3c7; border:1px solid #f59e0b; padding:10px; border-radius:8px;">
                <label style="display:flex; align-items:center; gap:10px; font-weight:800; color:#92400e;">
                    <input type="checkbox" id="modal-extra" ${datos.vueltasTotales >= 4 ? 'checked' : ''} style="transform:scale(1.5);">
                    MARCAR COMO VUELTA EXTRA
                </label>
                <p style="font-size:0.7rem; margin-top:5px;">Si se marca como extra, la unidad figurará como Jornada Cumplida inmediatamente.</p>
            </div>
        </div>
    `;
    modal.showModal();
};

document.getElementById('btn-save-modal').onclick = async () => {
    const obs = document.getElementById('modal-obs').value;
    const esExtra = document.getElementById('modal-extra').checked;

    const updates = { observaciones: obs };
    if (esExtra) updates.vueltasTotales = 4; // Forzamos el sello visual

    await actualizarRegistro(unidadActualId, updates);
    modal.close();
};

document.getElementById('close-modal').onclick = () => modal.close();