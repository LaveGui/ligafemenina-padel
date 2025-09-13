// CONFIGURACIÓN - ¡MUY IMPORTANTE!
// DEBES REEMPLAZAR ESTA URL POR LA NUEVA URL DE TU API DE GOOGLE APPS SCRIPT PARA ESTA LIGA
const API_URL = "https://script.google.com/macros/s/AKfycbzHHNHv7nq-rPmb_t7hfoEXPOqHwrxiLy_zomf89JtWoZm9E9dgIcvLhJuRcKRMEDSrrw/exec"; 

let leagueData = {}; // Almacenará todos los datos de la liga
let allTeams = []; // Para almacenar las parejas y popular el selector

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderLeague();

    // Event listener para el selector de parejas
    document.getElementById('team-filter').addEventListener('change', (event) => {
        const selectedTeamName = event.target.value;
        handleTeamSelection(selectedTeamName);
    });

    // Event listener para el acordeón de Telegram
    const telegramAccordion = document.getElementById('telegram-prompt-liga');
    if (telegramAccordion) {
        const accordionHeader = telegramAccordion.querySelector('.accordion-header');
        if (accordionHeader) {
            accordionHeader.addEventListener('click', (event) => {
                // Prevenir que el click en el botón de unirse active/desactive el acordeón
                if (event.target.closest('.telegram-button')) {
                    return;
                }
                telegramAccordion.classList.toggle('expanded');
            });
        }
    }

    // Lógica del modal (mantenerla por si se usa para registro de partidos)
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    const resultForm = document.getElementById('result-form');
    if (resultForm) {
        resultForm.addEventListener('submit', handleResultSubmit);
    }
});

async function fetchAndRenderLeague() {
    showLoaders();
    try {
        const response = await fetch(`${API_URL}?endpoint=getLeagueData`);
        const result = await response.json();

        if (result.success) {
            leagueData = result.data;
            allTeams = leagueData.parejas; // Guardar las parejas cargadas
            renderLeagueView();
            populateTeamFilter(); // Rellenar el selector de parejas
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("Error al cargar datos de la liga:", error);
        document.getElementById('classification-table-body').innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error al cargar los datos.</td></tr>`;
    } finally {
        hideLoaders();
    }
}

function renderLeagueView() {
    renderClassificationTable(leagueData.clasificacion);
    renderMatchesList(leagueData.partidos);
}

function populateTeamFilter() {
    const teamFilter = document.getElementById('team-filter');
    teamFilter.innerHTML = '<option value="">-- Selecciona tu pareja --</option>'; // Resetear opciones
    allTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.Pareja;
        option.textContent = team.Pareja;
        teamFilter.appendChild(option);
    });
}

function renderClassificationTable(classification) {
    const tableBody = document.getElementById('classification-table-body');
    tableBody.innerHTML = '';
    
    classification.forEach((team, index) => {
        const row = document.createElement('tr');
        const teamName = team.isOnFire ? `${team.Pareja} 🔥` : team.Pareja;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${teamName}</td>
            <td>${team.PJ || 0}</td>
            <td>${team.Puntos || 0}</td>
            <td>${team.DS || 0}</td>
            <td>${team.DJ || 0}</td>
        `;
        row.dataset.teamName = team.Pareja; // Añadir data-attribute para el resaltado
        tableBody.appendChild(row);
    });
}

function renderMatchesList(matches) {
    const container = document.getElementById('matches-list-container');
    container.innerHTML = '';
    matches.forEach(match => {
        const matchEl = document.createElement('div');
        matchEl.className = 'match-item';
        
        let team1Name = `<span>${match['Nombre Pareja 1']}</span>`;
        let team2Name = `<span>${match['Nombre Pareja 2']}</span>`;

        if (match.ganador == 1) {
            team1Name = `<strong class="winner">${match['Nombre Pareja 1']}</strong>`;
        } else if (match.ganador == 2) {
            team2Name = `<strong class="winner">${match['Nombre Pareja 2']}</strong>`;
        }
        
        const teams = `${team1Name} vs ${team2Name}`;
        const resultHtml = (match.Estado === 'Jugado') 
            ? `<div class="match-result">${match.Resultado}</div>`
            : `<div class="match-result pending">Pendiente</div>`;
        
        matchEl.innerHTML = `<div class="match-teams">${teams}</div>${resultHtml}`;
        
        // Añadir data-attributes para filtrar y resaltar
        matchEl.dataset.team1 = match['Nombre Pareja 1'];
        matchEl.dataset.team2 = match['Nombre Pareja 2'];
        matchEl.dataset.matchId = match.ID; // Para abrir el modal

        container.appendChild(matchEl);
    });

    // Añadir event listeners a los partidos pendientes para abrir el modal
    document.querySelectorAll('.match-item.pending').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.match-actions')) { // Asegurarse de no clickear botones
                openResultModal(item.dataset.matchId);
            }
        });
    });
}

function handleTeamSelection(selectedTeamName) {
    const statsContainer = document.getElementById('player-stats-section');
    const telegramPrompt = document.getElementById('telegram-prompt-liga');
    const telegramLink = document.getElementById('telegram-link-liga');

    // Des-resaltar todo primero
    document.querySelectorAll('.match-item, #classification-table-body tr').forEach(el => el.classList.remove('highlighted'));

    if (!selectedTeamName) {
        statsContainer.classList.add('hidden');
        telegramPrompt.classList.add('hidden'); // Ocultar si no hay selección
        return;
    }

    // Resaltar en la clasificación y partidos
    document.querySelectorAll('#classification-table-body tr').forEach(row => row.classList.toggle('highlighted', row.dataset.teamName === selectedTeamName));
    document.querySelectorAll('.match-item').forEach(item => item.classList.toggle('highlighted', item.dataset.team1 === selectedTeamName || item.dataset.team2 === selectedTeamName));

    // Mostrar estadísticas
    const selectedTeam = leagueData.clasificacion.find(team => team.Pareja === selectedTeamName);
    if (selectedTeam) {
        document.getElementById('stat-pj').textContent = selectedTeam.PJ || 0;
        document.getElementById('stat-puntos').textContent = selectedTeam.Puntos || 0;
        document.getElementById('stat-sg').textContent = selectedTeam.SG || 0;
        document.getElementById('stat-sp').textContent = selectedTeam.SP || 0;
        document.getElementById('stat-jf').textContent = selectedTeam.JF || 0;
        document.getElementById('stat-jc').textContent = selectedTeam.JC || 0;
        statsContainer.classList.remove('hidden');

        // Actualizar el enlace y mostrar el prompt de Telegram
        const teamNameForUrl = selectedTeam.Pareja.replace(/\s+/g, '-');
        telegramLink.href = `https://t.me/Tu_Bot_Aqui?start=liga_team_${selectedTeam.Numero}_${teamNameForUrl}`; // ¡IMPORTANTE: Reemplazar 'Tu_Bot_Aqui' por el @ de tu bot!
        telegramPrompt.classList.remove('hidden');
    } else {
        statsContainer.classList.add('hidden');
        telegramPrompt.classList.add('hidden');
    }
}

function showLoaders() {
    document.getElementById('classification-loader').classList.remove('hidden');
    document.getElementById('matches-loader').classList.remove('hidden');
    document.querySelector('.table-wrapper').classList.add('hidden');
    document.getElementById('matches-list-container').classList.add('hidden');
}

function hideLoaders() {
    document.getElementById('classification-loader').classList.add('hidden');
    document.getElementById('matches-loader').classList.add('hidden');
    document.querySelector('.table-wrapper').classList.remove('hidden');
    document.getElementById('matches-list-container').classList.remove('hidden');
}

// Lógica del Modal (para registrar resultados)
async function openResultModal(matchId) {
    const match = leagueData.partidos.find(m => m.ID == matchId);
    if (!match) return;

    document.getElementById('match-id-input').value = match.ID;
    document.getElementById('modal-team1-name').textContent = match['Nombre Pareja 1'];
    document.getElementById('modal-team2-name').textContent = match['Nombre Pareja 2'];

    // Limpiar inputs y status
    document.querySelectorAll('.score-input').forEach(input => input.value = '');
    document.getElementById('result-form-status').textContent = '';
    
    // Si el partido ya tiene resultado, precargarlo
    if (match.Estado === 'Jugado') {
        const scores = match.Resultado.split(', ').map(set => set.split('-').map(Number));
        if (scores[0]) { document.getElementById('set1_p1').value = scores[0][0]; document.getElementById('set1_p2').value = scores[0][1]; }
        if (scores[1]) { document.getElementById('set2_p1').value = scores[1][0]; document.getElementById('set2_p2').value = scores[1][1]; }
        if (scores[2]) { document.getElementById('set3_p1').value = scores[2][0]; document.getElementById('set3_p2').value = scores[2][1]; }
    }

    document.getElementById('result-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('result-modal').classList.add('hidden');
}

async function handleResultSubmit(event) {
    event.preventDefault();
    const matchId = document.getElementById('match-id-input').value;
    const statusEl = document.getElementById('result-form-status');
    statusEl.textContent = 'Guardando...';
    statusEl.style.color = 'var(--secondary-text-color)';

    const s1_p1 = parseInt(document.getElementById('set1_p1').value) || 0;
    const s1_p2 = parseInt(document.getElementById('set1_p2').value) || 0;
    const s2_p1 = parseInt(document.getElementById('set2_p1').value) || 0;
    const s2_p2 = parseInt(document.getElementById('set2_p2').value) || 0;
    const s3_p1 = parseInt(document.getElementById('set3_p1').value) || 0;
    const s3_p2 = parseInt(document.getElementById('set3_p2').value) || 0;

    const sets = [];
    if (s1_p1 !== 0 || s1_p2 !== 0) sets.push(`${s1_p1}-${s1_p2}`);
    if (s2_p1 !== 0 || s2_p2 !== 0) sets.push(`${s2_p1}-${s2_p2}`);
    if (s3_p1 !== 0 || s3_p2 !== 0) sets.push(`${s3_p1}-${s3_p2}`);

    if (sets.length === 0) {
        statusEl.textContent = 'Por favor, introduce al menos el resultado del primer set.';
        statusEl.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addMatchResult',
                matchId: matchId,
                resultado: sets.join(', ')
            })
        });
        const result = await response.json();

        if (result.success) {
            statusEl.textContent = 'Resultado guardado correctamente.';
            statusEl.style.color = '#27ae60';
            // Refrescar los datos de la liga después de guardar el resultado
            await fetchAndRenderLeague(); 
            // Vuelve a aplicar el filtro si había uno seleccionado
            const selectedTeam = document.getElementById('team-filter').value;
            if (selectedTeam) {
                handleTeamSelection(selectedTeam);
            }
            setTimeout(closeModal, 1500); // Cerrar modal después de un breve delay
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("Error al guardar el resultado:", error);
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.color = 'red';
    }
}