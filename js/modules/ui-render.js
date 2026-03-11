/**
 * ui-render.js - Gestión de Grid Zero Scroll y Eventos de Tarjeta
 */
import { actualizarRegistro, eliminarRegistro } from '../firebase/db-operations.js';

const grid = document.getElementById('grid-unidades');
const template = document.getElementById('template-card-unidad');

export function renderizarUnidades(unidades) {
    if (!grid || !template) return;
    grid.innerHTML = '';

    // 1. Filtramos los grupos para mantener el orden visual
    const grupo10 = unidades.filter(u => u.horarioIngreso === '10:00hs');
    const grupo11 = unidades.filter(u => u.horarioIngreso === '11:00hs');
    const otros = unidades.filter(u => u.horarioIngreso !== '10:00hs' && u.horarioIngreso !== '11:00hs');

    const inyectarGrupo = (lista, titulo) => {
        if (lista.length > 0) {
            const div = document.createElement('div');
            div.className = 'grid-divider';
            div.innerHTML = `<span>${titulo}</span>`;
            grid.appendChild(div);

            lista.forEach(uni => grid.appendChild(crearCardUnidad(uni)));
        }
    };

    // Inyectamos en orden jerárquico
    inyectarGrupo(grupo10, "INGRESO 10:00 HS");
    inyectarGrupo(grupo11, "INGRESO 11:00 HS");
    inyectarGrupo(otros, "OTROS / AUSENTES");

    // Card de agregar al final
    const cardAdd = document.createElement('div');
    cardAdd.className = 'card-add-unit';
    cardAdd.innerHTML = `<input type="text" id="input-nueva-unidad" placeholder="ID + ENTER">`;
    grid.appendChild(cardAdd);

    if (window.configurarInputNuevo) window.configurarInputNuevo();
    
    // Ajuste dinámico del grid para evitar scroll
    ajustarTamanioGrid(unidades.length);
}

function crearCardUnidad(data) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.unit-card');

    // --- CLASES DE ESTADO CRÍTICAS ---
    if (data.esCampo) card.classList.add('alert-campo');
    if (data.horarioIngreso === 'Ausente') card.classList.add('status-absent');
    if (data.vueltasTotales >= 3) card.classList.add('status-complete');
    if (data.vueltasTotales >= 4) card.classList.add('status-extra');

    // Tamaño de unidad
    const tam = data.tamano ? data.tamano.toLowerCase() : 'grande';
    card.classList.add(`size-${tam}`);

    // Inyectar textos
    clone.querySelector('.unit-id').innerText = data.unidad;
    clone.querySelector('.driver-name').innerText = `${data.chofer} (${data.tamano})`;
    clone.querySelector('.v-count').innerText = data.vueltasTotales || 0;

    // --- LÓGICA BOTÓN ELIMINAR (CORREGIDA) ---
    const btnDel = clone.querySelector('.btn-delete-card');
    if (btnDel) {
        btnDel.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Evita que el click active otros eventos de la tarjeta

            const confirmar = confirm(`¿Deseas quitar la unidad ${data.unidad} de la jornada?`);
            if (confirmar) {
                try {
                    await eliminarRegistro(data.idFirebase);
                    console.log(`Unidad ${data.unidad} eliminada.`);
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert("No se pudo eliminar la unidad.");
                }
            }
        };
    }

    // --- BOTONES DE BANDA RÁPIDA ---
    const botones = clone.querySelectorAll('.btn-banda');
    botones.forEach(btn => {
        const bandaKey = btn.dataset.banda;
        const activa = data.detalleVueltas?.some(v => v.banda === bandaKey);
        if (activa) btn.classList.add('active');
        
        btn.onclick = async (e) => {
            e.stopPropagation();
            let vueltas = [...(data.detalleVueltas || [])];
            if (activa) {
                vueltas = vueltas.filter(v => v.banda !== bandaKey);
            } else {
                vueltas.push({ banda: bandaKey, estado: 'Salida', nro: Date.now() });
            }
            // Eliminamos el import dinámico para mayor velocidad
            await actualizarRegistro(data.idFirebase, { 
                detalleVueltas: vueltas,
                vueltasTotales: vueltas.length 
            });
        };
    });

    // Botón Campo Toggle
    const btnCampo = clone.querySelector('.btn-campo-toggle');
    btnCampo.onclick = async (e) => {
        e.stopPropagation();
        await actualizarRegistro(data.idFirebase, { esCampo: !data.esCampo });
    };

    // Botón Gestionar (Notas)
    const btnGestion = clone.querySelector('.btn-edit-unit');
    btnGestion.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.abrirGestionVueltas === 'function') {
            window.abrirGestionVueltas(data.idFirebase);
        } else {
            console.error("Error: Función abrirGestionVueltas no cargada.");
        }
    };

    // Selector Ingreso
    const select = clone.querySelector('.select-ingreso');
    ["10:00hs", "11:00hs", "Electro", "Ausente"].forEach(opt => {
        const el = document.createElement('option');
        el.value = opt; el.innerText = opt;
        if (data.horarioIngreso === opt) el.selected = true;
        select.appendChild(el);
    });
    select.onchange = async (e) => {
        await actualizarRegistro(data.idFirebase, { horarioIngreso: e.target.value });
    };

    return card;
}

function ajustarTamanioGrid(total) {
    if (total > 15) {
        grid.style.gap = "8px";
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
    } else {
        grid.style.gap = "15px";
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(180px, 1fr))";
    }
}