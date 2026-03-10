/**
 * ui-render.js - Gestión de Grid Zero Scroll y Eventos de Tarjeta
 */
import { actualizarRegistro, eliminarRegistro } from '../firebase/db-operations.js';

const grid = document.getElementById('grid-unidades');
const template = document.getElementById('template-card-unidad');

export function renderizarUnidades(unidades) {
    if (!grid || !template) return;
    grid.innerHTML = '';

    // 1. Filtramos los grupos
    const grupo10 = unidades.filter(u => u.horarioIngreso === '10:00hs');
    const grupo11 = unidades.filter(u => u.horarioIngreso === '11:00hs');
    const otros = unidades.filter(u => u.horarioIngreso !== '10:00hs' && u.horarioIngreso !== '11:00hs');

    const inyectarGrupo = (lista, titulo) => {
        if (lista.length > 0) {
            // Creamos el divisor visual
            const div = document.createElement('div');
            div.className = 'grid-divider';
            div.innerHTML = `<span>${titulo}</span>`;
            grid.appendChild(div);

            // Inyectamos las tarjetas de ese grupo
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
}

function crearCardUnidad(data) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.unit-card');

    // --- CLASES DE ESTADO CRÍTICAS ---
    if (data.esCampo) {
        card.classList.add('alert-campo'); // Activa el pulso y el badge
    }
    
    if (data.horarioIngreso === 'Ausente') {
        card.classList.add('status-absent'); // Activa el color gris
    }

    if (data.vueltasTotales >= 3) {
        card.classList.add('status-complete'); // Activa el sello de jornada
    }

    if (data.vueltasTotales >= 4) {
        card.classList.add('status-extra'); // Nueva clase para CSS
    }

    // Tamaño de unidad
    const tam = data.tamano ? data.tamano.toLowerCase() : 'grande';
    card.classList.add(`size-${tam}`);

    // Inyectar textos
    clone.querySelector('.unit-id').innerText = data.unidad;
    clone.querySelector('.driver-name').innerText = `${data.chofer} (${data.tamano})`;
    clone.querySelector('.v-count').innerText = data.vueltasTotales || 0;

    // Configuración de botones de banda rápida
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
            const { actualizarRegistro } = await import('../firebase/db-operations.js');
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
        const { actualizarRegistro } = await import('../firebase/db-operations.js');
        await actualizarRegistro(data.idFirebase, { esCampo: !data.esCampo });
    };

    const btnGestion = clone.querySelector('.btn-edit-unit');

btnGestion.onclick = () => {
    if (typeof window.abrirGestionVueltas === 'function') {
        window.abrirGestionVueltas(data.idFirebase);
    } else {
        console.error("Error: La función abrirGestionVueltas no está cargada. Revisa gestion-vueltas.js");
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
        const { actualizarRegistro } = await import('../firebase/db-operations.js');
        await actualizarRegistro(data.idFirebase, { horarioIngreso: e.target.value });
    };

    return card;
}

function ajustarTamanioGrid(total) {
    // Si hay muchas unidades, reducimos drásticamente el tamaño para que entren
    if (total > 15) {
        grid.style.gap = "8px";
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
    } else {
        grid.style.gap = "15px";
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(180px, 1fr))";
    }
}