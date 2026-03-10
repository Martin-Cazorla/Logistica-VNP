/**
 * logistics-logic.js - Lógica de Negocio y Procesamiento
 */
import { UNIDADES_MAESTRA } from '../data/unidades.js';
import { buscarUnidadEnFirebase } from '../firebase/db-operations.js';

/**
 * Calcula las métricas globales para el header
 */
export function calcularKPIs(unidades) {
    return unidades.reduce((acc, uni) => {
        // Lógica para determinar si está en ruta (última vuelta registrada como Salida)
        const ultima = uni.detalleVueltas ? uni.detalleVueltas[uni.detalleVueltas.length - 1] : null;
        if (ultima?.estado === 'Salida') acc.ruta++;
        
        // Unidades disponibles (menos de 3 vueltas y no ausente)
        if (uni.vueltasTotales < 3 && uni.horarioIngreso !== 'Ausente') acc.libres++;
        
        acc.totalVueltas += (uni.vueltasTotales || 0);
        
        return acc;
    }, { ruta: 0, libres: 0, totalVueltas: 0 });
}

/**
 * Busca una unidad en el archivo local o en la base de datos maestra de Firebase
 */
export async function buscarUnidadGlobal(idUnidad) {
    // 1. Buscar en el archivo estático unidades.js
    const unidadLocal = UNIDADES_MAESTRA.find(u => u.id === idUnidad);
    if (unidadLocal) return unidadLocal;

    // 2. Si no está, buscar en la colección maestra de Firebase
    const unidadFirebase = await buscarUnidadEnFirebase(idUnidad);
    return unidadFirebase || null;
}