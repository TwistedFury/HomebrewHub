const apiBase = window.location.port === '5500'
    ? 'http://localhost:8000/api'
    : '../api';
const playerForm = document.getElementById('player-form');
const formStatus = document.getElementById('player-form-status');
const savedPlayers = document.getElementById('saved-players');
const attributeNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

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

        Object.entries(player.attributes || {}).forEach(([attribute, value]) => {
            const term = document.createElement('dt');
            term.textContent = attribute.charAt(0).toUpperCase() + attribute.slice(1);
            const detail = document.createElement('dd');
            detail.textContent = value;
            details.append(term, detail);
        });

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'player-edit-button';
        editButton.textContent = 'Edit player';
        editButton.addEventListener('click', () => showEditForm(card, player));

        card.append(name, character, details, editButton);
        savedPlayers.append(card);
    });
}

function createPlayerInput(label, name, value, type = 'text') {
    const container = document.createElement('div');
    const inputLabel = document.createElement('label');
    inputLabel.textContent = `${label}:`;
    inputLabel.htmlFor = `edit-player-${name}`;
    const input = document.createElement('input');
    input.type = type;
    input.id = inputLabel.htmlFor;
    input.name = name;
    input.value = value;
    input.required = true;
    if (type === 'number') {
        input.min = name === 'level' ? '1' : '1';
        input.max = name === 'level' ? '20' : '30';
    }
    container.append(inputLabel, input);
    return container;
}

function showEditForm(card, player) {
    const editForm = document.createElement('form');
    editForm.className = 'player-edit-form';
    editForm.append(
        createPlayerInput('Player Name', 'name', player.name),
        createPlayerInput('Character Name', 'character_name', player.character_name),
        createPlayerInput('Class', 'class', player.class),
        createPlayerInput('Level', 'level', player.level, 'number')
    );

    const attributes = document.createElement('fieldset');
    attributes.className = 'player-attributes';
    const legend = document.createElement('legend');
    legend.textContent = 'Attributes';
    attributes.append(legend);
    attributeNames.forEach(attribute => {
        attributes.append(
            createPlayerInput(
                attribute.charAt(0).toUpperCase() + attribute.slice(1),
                attribute,
                player.attributes[attribute],
                'number'
            )
        );
    });
    editForm.append(attributes);

    const actions = document.createElement('div');
    actions.className = 'player-edit-actions';
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Save changes';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'player-cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => renderPlayers(currentPlayers));
    actions.append(saveButton, cancelButton);
    editForm.append(actions);

    card.replaceChildren(editForm);
    editForm.addEventListener('submit', event => savePlayerChanges(event, editForm, player.player_id));
}

let currentPlayers = [];

async function savePlayerChanges(event, editForm, playerId) {
    event.preventDefault();
    const formData = new FormData(editForm);
    const player = {
        name: formData.get('name'),
        character_name: formData.get('character_name'),
        class: formData.get('class'),
        level: Number(formData.get('level')),
        attributes: Object.fromEntries(
            attributeNames.map(attribute => [attribute, Number(formData.get(attribute))])
        )
    };

    try {
        const response = await fetch(`${apiBase}/players/${encodeURIComponent(playerId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(player)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Player update failed (${response.status}).`);
        }
        await loadPlayers();
    } catch (error) {
        console.error(error);
        const errorMessage = document.createElement('p');
        errorMessage.className = 'player-edit-error';
        errorMessage.textContent = error.message || 'The player could not be saved.';
        editForm.append(errorMessage);
    }
}

async function loadPlayers() {
    try {
        currentPlayers = await getPlayers();
        renderPlayers(currentPlayers);
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
        level: Number(formData.get('player-level')),
        attributes: {
            strength: Number(formData.get('player-strength')),
            dexterity: Number(formData.get('player-dexterity')),
            constitution: Number(formData.get('player-constitution')),
            intelligence: Number(formData.get('player-intelligence')),
            wisdom: Number(formData.get('player-wisdom')),
            charisma: Number(formData.get('player-charisma'))
        }
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
