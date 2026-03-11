import { db } from '../firebase/firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById('tbody-historial');
const filtroMes = document.getElementById('filtro-mes-historial');
const busquedaUnidad = document.getElementById('busqueda-unidad');
const btnExportar = document.getElementById('btn-exportar');

let registrosDelMes = []; 

// --- INICIALIZACIÓN ---
const ahora = new Date();
const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
filtroMes.value = mesActual;

// --- EVENTOS ---
filtroMes.onchange = () => cargarDatosHistorial(filtroMes.value);
busquedaUnidad.oninput = () => aplicarFiltrosLocales();
btnExportar.onclick = () => exportarAExcel();

async function cargarDatosHistorial(mesAnio) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando...</td></tr>';
    try {
        const q = query(
            collection(db, "registros_jornada"),
            where("fecha", ">=", `${mesAnio}-01`),
            where("fecha", "<=", `${mesAnio}-31`),
            orderBy("fecha", "desc")
        );
        const querySnapshot = await getDocs(q);
        registrosDelMes = [];
        querySnapshot.forEach((doc) => registrosDelMes.push({ id: doc.id, ...doc.data() }));
        aplicarFiltrosLocales();
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
    }
}

/**
 * CORRECCIÓN: Búsqueda exacta
 * Si el usuario escribe, comparamos el valor exacto para evitar que 101 traiga 1018.
 */
function aplicarFiltrosLocales() {
    const termino = busquedaUnidad.value.trim();
    
    const filtrados = registrosDelMes.filter(reg => {
        if (termino === "") return true;
        // Usamos == para comparar número con string de forma segura
        return reg.unidad == termino; 
    });

    renderizarTabla(filtrados);
}

function renderizarTabla(lista) {
    tbody.innerHTML = '';
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay resultados.</td></tr>';
        return;
    }

    lista.forEach((data) => {
        const fila = document.createElement('tr');
        const zonas = data.detalleVueltas?.map(v => v.zona).join(', ') || '---';
        
        // Lógica de Extras: Si vueltasTotales es 4 o más, la extra es (total - 3)
        // O si marcamos el check de extra en el modal, suele ser 1.
        const cantidadExtras = data.vueltasTotales >= 4 ? (data.vueltasTotales - 3) : 0;

        fila.innerHTML = `
            <td class="col-fecha">${data.fecha}</td>
            <td class="col-unidad"><span>${data.unidad}</span></td>
            <td style="font-weight: 600;">${data.chofer}</td>
            <td class="text-center">
                <div class="badge-vueltas">${data.vueltasTotales > 3 ? 3 : data.vueltasTotales}</div>
            </td>
            <td class="text-center">
                <div class="badge-extras ${cantidadExtras > 0 ? 'active' : ''}">${cantidadExtras}</div>
            </td>
            <td>${zonas}</td>
            <td class="obs-text">${data.observaciones || 'Sin observaciones'}</td>
        `;
        tbody.appendChild(fila);
    });
}

/**
 * FUNCIÓN EXPORTAR A EXCEL
 * Descarga exactamente lo que está renderizado en el tbody en ese momento.
 */
function exportarAExcel() {
    const filas = [];
    const headers = ["Fecha", "Unidad", "Chofer", "Vueltas", "Extras", "Zonas", "Observaciones"];
    filas.push(headers);

    const trs = tbody.querySelectorAll('tr');
    if (trs.length === 0 || trs[0].innerText.includes("No hay")) return;

    trs.forEach(tr => {
        const celdas = tr.querySelectorAll('td');
        filas.push([
            celdas[0].innerText,
            celdas[1].innerText,
            celdas[2].innerText,
            celdas[3].innerText,
            celdas[4].innerText, // Nueva celda de Extras
            celdas[5].innerText,
            celdas[6].innerText
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [{wch:12}, {wch:10}, {wch:25}, {wch:10}, {wch:10}, {wch:30}, {wch:40}];
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Reporte_TMS_${filtroMes.value}.xlsx`);
}

// Carga inicial
cargarDatosHistorial(mesActual);