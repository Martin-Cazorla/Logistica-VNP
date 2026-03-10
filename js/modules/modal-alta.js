/**
 * modal-alta.js - Lógica del formulario de nuevas unidades
 */
import { guardarNuevaUnidadMaestra } from '../firebase/db-operations.js';

const modal = document.getElementById('modal-alta-unidad');
const form = document.getElementById('form-alta-unidad');

export function abrirModalAlta(id) {
    document.getElementById('alta-id').value = id;
    modal.showModal(); // Método nativo de <dialog>
}

export function cerrarModalAlta() {
    form.reset();
    modal.close();
}

// Configurar el envío del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevaUnidad = {
        id: document.getElementById('alta-id').value,
        chofer: document.getElementById('alta-chofer').value,
        modelo: document.getElementById('alta-modelo').value,
        tamano: document.getElementById('alta-tamano').value
    };

    await guardarNuevaUnidadMaestra(nuevaUnidad);
    
    // Notificación Senior (puedes usar SweetAlert2 aquí)
    alert(`Unidad ${nuevaUnidad.id} guardada con éxito.`);
    
    cerrarModalAlta();
    
    // Disparar un evento personalizado o llamar a una función para refrescar la carga
    location.reload(); // Recarga simple para asegurar que la nueva unidad sea reconocida
});

// Eventos de cierre
document.getElementById('close-alta-modal').onclick = cerrarModalAlta;
document.getElementById('btn-cancelar-alta').onclick = cerrarModalAlta;