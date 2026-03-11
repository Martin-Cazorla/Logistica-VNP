/**
 * helpers.js - Funciones de utilidad y reglas de negocio
 */

// Centralizamos el cálculo de extras (si mañana cambia a 5 vueltas, solo cambias el '3' aquí)
export const calcularExtras = (vueltasTotales) => {
    const LIMITE_NORMAL = 3;
    const total = parseInt(vueltasTotales) || 0;
    return total > LIMITE_NORMAL ? (total - LIMITE_NORMAL) : 0;
};

// Formateo de nombres de días consistente
export const getNombreDia = (fechaStr) => {
    const fecha = new Date(fechaStr + "T00:00:00");
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
};

// Función universal para cerrar cualquier modal o dialog
export const cerrarCualquierModal = () => {
    document.querySelectorAll('dialog').forEach(d => d.close());
    document.querySelectorAll('.modal-global, .modal, .modal-base').forEach(m => m.classList.remove('active'));
};

// Exponemos a window para los onclick del HTML
window.smartClose = cerrarCualquierModal;
window.cerrarModalCierre = cerrarCualquierModal; // Mantenemos compatibilidad con nombres viejos