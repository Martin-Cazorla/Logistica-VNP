/**
 * historial.js - Gestión de consulta histórica y filtrado local
 */
import { db } from '../firebase/firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById('tbody-historial');
const filtroMes = document.getElementById('filtro-mes-historial');
const busquedaUnidad = document.getElementById('busqueda-unidad');

// Almacén temporal para filtrar en memoria y ahorrar lecturas de Firebase
let registrosDelMes = []; 

// 1. Inicialización de Fecha (Mes Actual)
const ahora = new Date();
const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
if (filtroMes) {
    filtroMes.value = mesActual;
    filtroMes.onchange = () => cargarDatosHistorial(filtroMes.value);
}

// 2. Evento de Búsqueda en tiempo real
if (busquedaUnidad) {
    busquedaUnidad.oninput = () => aplicarFiltrosLocales();
}

/**
 * Trae todos los documentos del mes seleccionado desde Firestore
 */
async function cargarDatosHistorial(mesAnio) {
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px;">Cargando registros del mes...</td></tr>';
    
    try {
        // Consultamos el rango del mes (del día 01 al 31)
        const q = query(
            collection(db, "registros_jornada"),
            where("fecha", ">=", `${mesAnio}-01`),
            where("fecha", "<=", `${mesAnio}-31`),
            orderBy("fecha", "desc")
        );

        const querySnapshot = await getDocs(q);
        registrosDelMes = []; 

        querySnapshot.forEach((doc) => {
            registrosDelMes.push({ idFirebase: doc.id, ...doc.data() });
        });

        aplicarFiltrosLocales(); 

    } catch (error) {
        console.error("Error al cargar historial:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Error al recuperar datos. Revisa la consola.</td></tr>';
    }
}

/**
 * Filtra el array local por el ID de unidad sin re-consultar Firebase
 */
function aplicarFiltrosLocales() {
    const termino = busquedaUnidad.value.trim().toLowerCase();
    
    const filtrados = registrosDelMes.filter(reg => {
        const unidadStr = reg.unidad ? reg.unidad.toString().toLowerCase() : "";
        return unidadStr.includes(termino);
    });

    renderizarTabla(filtrados, termino);
}

/**
 * Dibuja las filas en la tabla con los estilos Senior
 */
function renderizarTabla(lista, resaltado = "") {
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No se encontraron registros para los criterios seleccionados.</td></tr>';
        return;
    }

    lista.forEach((data) => {
        const fila = document.createElement('tr');
        
        // Formateo de zonas
        const zonas = data.detalleVueltas?.map(v => v.zona).join(', ') || '---';
        
        // Lógica de resaltado para la búsqueda
        let unidadDisplay = data.unidad;
        if (resaltado && unidadDisplay.toString().toLowerCase().includes(resaltado)) {
            const regex = new RegExp(`(${resaltado})`, 'gi');
            unidadDisplay = unidadDisplay.toString().replace(regex, '<mark>$1</mark>');
        }

        fila.innerHTML = `
            <td class="col-fecha">${data.fecha}</td>
            <td class="col-unidad"><span>${unidadDisplay}</span></td>
            <td style="font-weight: 600;">${data.chofer}</td>
            <td class="text-center">
                <div class="badge-vueltas">${data.vueltasTotales || 0}</div>
            </td>
            <td>${zonas}</td>
            <td class="obs-text">${data.observaciones || 'Sin observaciones'}</td>
        `;
        tbody.appendChild(fila);
    });
}

// Carga inicial al abrir la página
cargarDatosHistorial(mesActual);