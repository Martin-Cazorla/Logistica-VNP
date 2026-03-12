/**
 * ui-render.js - Gestión de Grid y Renderizado con Alerta de Campo y Notas
 */
import { actualizarRegistro, eliminarRegistro } from '../firebase/db-operations.js';
import { calcularExtras } from '../utils/helpers.js';

const grid = document.getElementById('grid-unidades');
const template = document.getElementById('template-card-unidad');

export function renderizarUnidades(unidades) {
    if (!grid || !template) return;
    grid.innerHTML = '';

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

    inyectarGrupo(grupo10, "INGRESO 10:00 HS");
    inyectarGrupo(grupo11, "INGRESO 11:00 HS");
    inyectarGrupo(otros, "OTROS / AUSENTES");

    const cardAdd = document.createElement('div');
    cardAdd.className = 'card-add-unit';
    cardAdd.innerHTML = `<input type="text" id="input-nueva-unidad" placeholder="ID + ENTER">`;
    grid.appendChild(cardAdd);

    if (window.configurarInputNuevo) window.configurarInputNuevo();
    ajustarTamanioGrid(unidades.length);
}

function crearCardUnidad(data) {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.unit-card');
    const headerRight = clone.querySelector('.header-right');

    // --- LÓGICA DE ESTADOS ---
    const numExtras = calcularExtras(data.vueltasTotales);

    if (data.esCampo) card.classList.add('alert-campo');
    if (data.horarioIngreso === 'Ausente') card.classList.add('status-absent');
    if (data.vueltasTotales >= 3) card.classList.add('status-complete');
    if (numExtras > 0) card.classList.add('status-extra');
    if (data.finalizada) card.classList.add('status-finished');

    // --- INDICADOR DE OBSERVACIONES 📝 ---
    if (data.observaciones && data.observaciones.trim() !== "") {
        card.classList.add('has-observation');
        const badgeObs = document.createElement('span');
        badgeObs.innerHTML = '📝';
        badgeObs.title = "Tiene observaciones";
        badgeObs.style.fontSize = "0.9rem";
        badgeObs.style.cursor = "help";
        headerRight.appendChild(badgeObs);
    }

    const tam = data.tamano ? data.tamano.toLowerCase() : 'grande';
    card.classList.add(`size-${tam}`);

    // Inyectar textos
    clone.querySelector('.unit-id').innerText = data.unidad;
    clone.querySelector('.driver-name').innerText = `${data.chofer} (${data.tamano})`;
    clone.querySelector('.v-count').innerText = data.vueltasTotales || 0;

    // --- REPARACIÓN ALERTA DE CAMPO (Inyectar Badge Rojo) ---
    if (data.esCampo) {
        const badgeCampo = document.createElement('span');
        badgeCampo.className = 'unit-badge'; // Esta clase ya la tenés en el SCSS
        badgeCampo.innerText = 'CAMPO';
        // Lo insertamos justo después del ID de la unidad
        clone.querySelector('.unit-id').after(badgeCampo);
    }

    // Botón Eliminar
    clone.querySelector('.btn-delete-card').onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`¿Quitar unidad ${data.unidad}?`)) {
            await eliminarRegistro(data.idFirebase);
        }
    };

    // Botones de Banda
    clone.querySelectorAll('.btn-banda').forEach(btn => {
        const bandaKey = btn.dataset.banda;
        const activa = data.detalleVueltas?.some(v => v.banda === bandaKey);
        if (activa) btn.classList.add('active');
        
        btn.onclick = async (e) => {
            e.stopPropagation();
            if (data.finalizada) return alert("Unidad finalizada.");
            let vueltas = [...(data.detalleVueltas || [])];
            activa ? vueltas = vueltas.filter(v => v.banda !== bandaKey) : vueltas.push({ banda: bandaKey, estado: 'Salida', nro: Date.now() });
            await actualizarRegistro(data.idFirebase, { detalleVueltas: vueltas, vueltasTotales: vueltas.length });
        };
    });

    // Botón Campo Toggle (Activación del Icono)
    const btnCampo = clone.querySelector('.btn-campo-toggle');
    if (data.esCampo) btnCampo.classList.add('active'); // Para que el filtro grayscale desaparezca
    btnCampo.onclick = async (e) => {
        e.stopPropagation();
        await actualizarRegistro(data.idFirebase, { esCampo: !data.esCampo });
    };

    clone.querySelector('.btn-edit-unit').onclick = (e) => {
        e.stopPropagation();
        window.abrirGestionVueltas(data.idFirebase);
    };

    const select = clone.querySelector('.select-ingreso');
    ["10:00hs", "11:00hs", "Electro", "Ausente"].forEach(opt => {
        const el = document.createElement('option');
        el.value = opt; el.innerText = opt;
        if (data.horarioIngreso === opt) el.selected = true;
        select.appendChild(el);
    });
    select.onchange = async (e) => await actualizarRegistro(data.idFirebase, { horarioIngreso: e.target.value });

    return card;
}

function ajustarTamanioGrid(total) {
    grid.style.gap = total > 15 ? "8px" : "15px";
    grid.style.gridTemplateColumns = total > 15 ? "repeat(auto-fill, minmax(140px, 1fr))" : "repeat(auto-fill, minmax(180px, 1fr))";
}