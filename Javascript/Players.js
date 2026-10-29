const apiBase = window.location.port === '5500'
    ? 'http://localhost:8000/api'
    : '../api';
const playerForm = document.getElementById('player-form');
const formStatus = document.getElementById('player-form-status');
const savedPlayers = document.getElementById('saved-players');

async function getPlayers() {
    const response = await fetch(`${apiBase}/players`);
    if (!response.ok) {
        throw new Error(`Player data request failed (${response.status}).`);
    }
    const players = await response.json();
    if (!Array.isArray(players)) {
        throw new Error('Player data must be a JSON array.');
    }
    return players;
}

function renderPlayers(players) {
    savedPlayers.replaceChildren();
    if (players.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No players have been saved yet.';
        savedPlayers.append(message);
        return;
    }

    players.forEach(player => {
        const card = document.createElement('article');
        card.className = 'player-card';

        const name = document.createElement('h3');
        name.textContent = player.name;

        const character = document.createElement('p');
        character.textContent = player.character_name;

        const details = document.createElement('dl');
        [['Class', player.class], ['Level', player.level], ['Player ID', player.player_id]]
            .forEach(([label, value]) => {
                const term = document.createElement('dt');
                term.textContent = label;
                const detail = document.createElement('dd');
                detail.textContent = value;
                details.append(term, detail);
            });

        card.append(name, character, details);
        savedPlayers.append(card);
    });
}

async function loadPlayers() {
    try {
        renderPlayers(await getPlayers());
    } catch (error) {
        console.error(error);
        savedPlayers.textContent = 'The saved players could not be loaded.';
    }
}

playerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(playerForm);
    const player = {
        name: formData.get('player-name'),
        character_name: formData.get('character-name'),
        class: formData.get('player-class'),
        level: Number(formData.get('player-level'))
    };

    formStatus.textContent = 'Saving player...';
    try {
        const response = await fetch(`${apiBase}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(player)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Player creation failed (${response.status}).`);
        }
        playerForm.reset();
        document.getElementById('player-level').value = '1';
        formStatus.textContent = 'Player saved.';
        await loadPlayers();
    } catch (error) {
        console.error(error);
        formStatus.textContent = 'The player could not be saved.';
    }
});

loadPlayers();
