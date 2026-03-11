/**
 * indicadores.js - Dashboard de Flota Activa y Productividad Extra
 */
import { db } from '../firebase/firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const filtroSemana = document.getElementById('filtro-semana');
let miGrafico = null;

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const numeroSemana = getWeekNumber(hoy);
    // Establecemos el valor inicial del input (YYYY-Www)
    filtroSemana.value = `${hoy.getFullYear()}-W${numeroSemana}`;
    
    cargarIndicadores();
});

// Evento de cambio de semana
filtroSemana.onchange = () => cargarIndicadores();

// --- 2. FLUJO DE DATOS ---
async function cargarIndicadores() {
    const valorSemana = filtroSemana.value; // Ejemplo: "2026-W11"
    if (!valorSemana) return;

    const [anio, semana] = valorSemana.split('-W');
    const { inicio, fin } = getRangeOfWeek(parseInt(semana), parseInt(anio));

    // Estructura de datos para el gráfico (Lunes a Sábado)
    const stats = {
        'Lunes': { unidades: new Set(), extras: 0 },
        'Martes': { unidades: new Set(), extras: 0 },
        'Miércoles': { unidades: new Set(), extras: 0 },
        'Jueves': { unidades: new Set(), extras: 0 },
        'Viernes': { unidades: new Set(), extras: 0 },
        'Sábado': { unidades: new Set(), extras: 0 }
    };

    try {
        // Consultamos Firebase filtrando por el rango de la semana elegida
        const q = query(
            collection(db, "registros_jornada"),
            where("fecha", ">=", inicio),
            where("fecha", "<=", fin)
        );

        const snap = await getDocs(q);
        let totalExtrasGlobal = 0;
        let unidadesUnicasSemana = new Set();

        snap.forEach(doc => {
            const d = doc.data();
            const nombreDia = obtenerNombreDia(d.fecha);
            
            if (stats[nombreDia]) {
                // Registro de unidades (usamos Set para no repetir IDs en el mismo día)
                stats[nombreDia].unidades.add(d.unidad);
                unidadesUnicasSemana.add(d.unidad);

                // Cálculo de extras (vueltas por encima de las 3 reglamentarias)
                const ex = d.vueltasTotales >= 4 ? (d.vueltasTotales - 3) : 0;
                stats[nombreDia].extras += ex;
                totalExtrasGlobal += ex;
            }
        });

        // Actualizamos los números grandes del Header
        actualizarKPIs(unidadesUnicasSemana.size, totalExtrasGlobal);
        
        // Dibujamos el gráfico de doble eje
        renderizarGraficoDobleEje(stats);

    } catch (e) {
        console.error("Error cargando indicadores:", e);
    }
}

// --- 3. RENDERIZADO VISUAL ---
function renderizarGraficoDobleEje(stats) {
    const ctx = document.getElementById('chart-rendimiento').getContext('2d');
    if (miGrafico) miGrafico.destroy();

    const labels = Object.keys(stats);
    const dataUnidades = labels.map(dia => stats[dia].unidades.size);
    const dataExtras = labels.map(dia => stats[dia].extras);

    miGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Unidades Activas',
                    data: dataUnidades,
                    backgroundColor: 'rgba(0, 51, 102, 0.8)', 
                    yAxisID: 'y',
                    borderRadius: 5
                },
                {
                    label: 'Extras (Guías)',
                    data: dataExtras,
                    type: 'line', 
                    borderColor: '#e30613', 
                    backgroundColor: '#e30613',
                    borderWidth: 3,
                    pointRadius: 5,
                    yAxisID: 'y1',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Cantidad de Unidades', font: { weight: 'bold' } },
                    ticks: { stepSize: 1 }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Cantidad de Extras', font: { weight: 'bold' } },
                    grid: { drawOnChartArea: false },
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function actualizarKPIs(uni, ext) {
    const elUni = document.getElementById('kpi-unidades');
    const elExt = document.getElementById('kpi-extras');
    if (elUni) elUni.innerText = uni;
    if (elExt) elExt.innerText = ext;
}

// --- 4. UTILIDADES DE FECHAS (Lógica Senior) ---

function obtenerNombreDia(fechaStr) {
    // Forzamos el horario local para evitar desfases de zona horaria
    const fecha = new Date(fechaStr + "T00:00:00");
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function getRangeOfWeek(week, year) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const ISOweekEnd = new Date(ISOweekStart);
    ISOweekEnd.setDate(ISOweekStart.getDate() + 5); // Hasta el Sábado

    return {
        inicio: ISOweekStart.toISOString().split('T')[0],
        fin: ISOweekEnd.toISOString().split('T')[0]
    };
}