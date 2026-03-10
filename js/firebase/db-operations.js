import { db } from './firebase-config.js';
import { 
    collection, 
    setDoc,
    doc, 
    getDoc,
    query, 
    where, 
    onSnapshot,
    updateDoc,
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Busca una unidad en la colección maestra global
 */
export async function buscarUnidadEnFirebase(idUnidad) {
    try {
        const docRef = doc(db, "unidades_maestra", idUnidad);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error al buscar unidad maestra:", error);
        return null;
    }
}

/**
 * Guarda una nueva unidad en la maestra global
 */
export async function guardarNuevaUnidadMaestra(datosUnidad) {
    try {
        await setDoc(doc(db, "unidades_maestra", datosUnidad.id), datosUnidad);
    } catch (error) {
        console.error("Error al guardar en maestra:", error);
        throw error;
    }
}

/**
 * NUEVA: Escucha los registros filtrados por una fecha específica.
 * Reemplaza a 'obtenerRegistrosEnVivo'.
 */
export function obtenerRegistrosPorFecha(fecha, callback) {
    const q = query(collection(db, "registros_jornada"), where("fecha", "==", fecha));
    
    return onSnapshot(q, (snapshot) => {
        const datos = snapshot.docs.map(doc => ({
            idFirebase: doc.id,
            ...doc.data()
        }));
        callback(datos);
    }, (error) => {
        console.error("Error en tiempo real (onSnapshot):", error);
    });
}

/**
 * ACTUALIZADA: Registra una unidad permitiendo especificar la fecha.
 * Esto permite cargar datos en días anteriores desde el calendario.
 */
export async function registrarUnidadEnJornada(unidad, fechaManual) {
    try {
        // Si no se pasa fechaManual, usamos el día de hoy por defecto
        const fechaParaRegistro = fechaManual || new Date().toISOString().split('T')[0];
        const idUnica = `${fechaParaRegistro}_${unidad.id}`; 

        await setDoc(doc(db, "registros_jornada", idUnica), {
            ...unidad,
            unidad: unidad.id,
            fecha: fechaParaRegistro,
            vueltasTotales: 0,
            detalleVueltas: [],
            horarioIngreso: "10:00hs",
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Error al registrar unidad en jornada:", error);
    }
}

/**
 * Actualiza campos específicos de un registro (notas, extras, etc.)
 */
export async function actualizarRegistro(idFirebase, datosActualizados) {
    try {
        const docRef = doc(db, "registros_jornada", idFirebase);
        await updateDoc(docRef, datosActualizados);
    } catch (error) {
        console.error("Error al actualizar registro:", error);
    }
}

/**
 * Recupera un registro específico por su ID
 */
export async function obtenerRegistroPorId(idFirebase) {
    try {
        const docRef = doc(db, "registros_jornada", idFirebase);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error al obtener registro:", error);
        return null;
    }
}

/**
 * Elimina un registro de la jornada seleccionada
 */
export async function eliminarRegistro(idFirebase) {
    try {
        const docRef = doc(db, "registros_jornada", idFirebase);
        await deleteDoc(docRef);
        console.log(`Registro ${idFirebase} eliminado correctamente.`);
    } catch (error) {
        console.error("Error al intentar eliminar el registro:", error);
        throw error;
    }
}