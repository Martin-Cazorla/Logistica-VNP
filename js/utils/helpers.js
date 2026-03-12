/**
 * helpers.js - Centralización de Reglas de Negocio y Utilidades
 */

// 1. Regla de Extras: Si cambia el límite, solo se toca aquí.
export const calcularExtras = (vueltasTotales) => {
    const LIMITE_NORMAL = 3;
    const total = parseInt(vueltasTotales) || 0;
    return total > LIMITE_NORMAL ? (total - LIMITE_NORMAL) : 0;
};

// 2. Utilidad de Modales: Cierra <dialog> y quita clases a <div>
export const cerrarCualquierModal = () => {
    // Manejo de etiquetas <dialog> nativas
    document.querySelectorAll('dialog').forEach(d => {
        if (d.open) d.close();
    });

    // Manejo de clases CSS para modales personalizados
    const clasesAModificar = ['.modal-global', '.modal', '.modal-base', '.active'];
    clasesAModificar.forEach(clase => {
        document.querySelectorAll(clase).forEach(m => {
            m.classList.remove('active');
        });
    });
};

// Exponer a window para compatibilidad con botones HTML (onclick)
window.smartClose = cerrarCualquierModal;
window.cerrarModalCierre = cerrarCualquierModal;