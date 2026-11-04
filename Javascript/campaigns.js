const campaignContainer = document.getElementById('campaign-portfolio');
const campaignId = new URLSearchParams(window.location.search).get('id');
const apiBase = window.location.port === '5500'
    ? 'http://localhost:8000/api'
    : '../api';

function getCampaigns() {
    return fetch(`${apiBase}/campaigns`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Campaign data request failed (${response.status}).`);
            }
            return response.json();
        })
        .then(campaigns => campaigns);
}

function getPlayers() {
    return fetch('../Data/players.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Player data request failed (${response.status}).`);
            }
            return response.json();
        })
        .then(players => {
            if (!Array.isArray(players)) {
                throw new Error('Player data must be a JSON array.');
            }
            return players;
        });
}

function showMessage(message) {
    campaignContainer.textContent = message;
}

function renderPlayerCards(campaign, players) {
    const section = document.createElement('section');
    section.className = 'campaign-players';
    section.setAttribute('aria-labelledby', 'players-heading');

    const heading = document.createElement('h2');
    heading.id = 'players-heading';
    heading.textContent = 'Players';

    const assignedPlayerIds = Array.isArray(campaign.players)
        ? [...campaign.players]
        : [];
    const management = document.createElement('div');
    management.className = 'player-management';

    const addLabel = document.createElement('label');
    addLabel.htmlFor = 'player-to-add';
    addLabel.textContent = 'Add a saved player';

    const addRow = document.createElement('div');
    addRow.className = 'player-add-row';

    const playerSelect = document.createElement('select');
    playerSelect.id = 'player-to-add';
    playerSelect.className = 'player-select';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select a player...';
    playerSelect.append(emptyOption);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'player-action-button';
    addButton.textContent = 'Add player';

    const saveStatus = document.createElement('p');
    saveStatus.className = 'player-save-status';
    saveStatus.setAttribute('aria-live', 'polite');

    function updatePlayerOptions() {
        playerSelect.replaceChildren(emptyOption);
        players
            .filter(player => !assignedPlayerIds.includes(player.player_id))
            .forEach(player => {
                const option = document.createElement('option');
                option.value = player.player_id;
                option.textContent = `${player.name} (${player.character_name})`;
                playerSelect.append(option);
            });
        addButton.disabled = playerSelect.options.length === 1;
    }

    addButton.addEventListener('click', () => {
        if (playerSelect.value && !assignedPlayerIds.includes(playerSelect.value)) {
            assignedPlayerIds.push(playerSelect.value);
            playerSelect.value = '';
            updatePlayerOptions();
            renderCards();
            saveStatus.textContent = 'Player list changed. Save to apply it.';
        }
    });

    async function savePlayers() {
        saveButton.disabled = true;
        saveStatus.textContent = 'Saving player list...';
        try {
            const response = await fetch(`${apiBase}/campaigns/${encodeURIComponent(campaign.campaign_id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ players: assignedPlayerIds })
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `Player update failed (${response.status}).`);
            }
            campaign.players = [...assignedPlayerIds];
            saveStatus.textContent = 'Player list saved.';
            updatePlayerOptions();
            renderCampaign(campaign, players);
        } catch (error) {
            console.error(error);
            saveStatus.textContent = 'The player list could not be saved.';
        } finally {
            saveButton.disabled = false;
        }
    }

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'player-action-button player-save-button';
    saveButton.textContent = 'Save player changes';
    saveButton.addEventListener('click', savePlayers);

    addRow.append(playerSelect, addButton, saveButton);
    management.append(addLabel, addRow, saveStatus);

    const searchLabel = document.createElement('label');
    searchLabel.htmlFor = 'player-search';
    searchLabel.textContent = 'Search players';

    const searchInput = document.createElement('input');
    searchInput.id = 'player-search';
    searchInput.type = 'search';
    searchInput.placeholder = 'Search by player, character, or class...';
    searchInput.className = 'player-search';

    const results = document.createElement('p');
    results.className = 'player-results';
    results.setAttribute('aria-live', 'polite');

    const cards = document.createElement('div');
    cards.className = 'player-cards';

    const campaignPlayerIds = Array.isArray(campaign.players) ? campaign.players : [];
    const campaignPlayers = campaignPlayerIds.map(playerId => {
        const player = players.find(item => item.player_id === playerId);
        return player || {
            player_id: playerId,
            name: 'Unknown player',
            character_name: 'Player data unavailable',
            class: 'Unknown',
            level: '-'
        };
    });

    function renderCards() {
        const query = searchInput.value.trim().toLowerCase();
        const filteredPlayers = campaignPlayers.filter(player =>
            [player.name, player.character_name, player.class, player.player_id]
                .some(value => String(value).toLowerCase().includes(query))
        );

        cards.replaceChildren();
        results.textContent = `Showing ${filteredPlayers.length} player${filteredPlayers.length === 1 ? '' : 's'}`;

        if (filteredPlayers.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'no-player-results';
            emptyMessage.textContent = 'No players matched the current search.';
            cards.append(emptyMessage);
            return;
        }

        filteredPlayers.forEach(player => {
            const card = document.createElement('article');
            card.className = 'player-card';

            const name = document.createElement('h3');
            name.textContent = player.name;

            const character = document.createElement('p');
            character.textContent = player.character_name;

            const details = document.createElement('dl');
            [
                ['Class', player.class],
                ['Level', player.level],
                ['Player ID', player.player_id]
            ].forEach(([label, value]) => {
                const term = document.createElement('dt');
                term.textContent = label;
                const detail = document.createElement('dd');
                detail.textContent = value;
                details.append(term, detail);
            });

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'player-remove-button';
            removeButton.textContent = 'Remove from campaign';
            removeButton.addEventListener('click', () => {
                const playerIndex = assignedPlayerIds.indexOf(player.player_id);
                if (playerIndex !== -1) {
                    assignedPlayerIds.splice(playerIndex, 1);
                    updatePlayerOptions();
                    renderCards();
                    saveStatus.textContent = 'Player list changed. Save to apply it.';
                }
            });

            card.append(name, character, details, removeButton);
            cards.append(card);
        });
    }

    searchInput.addEventListener('input', renderCards);
    section.append(heading, management, searchLabel, searchInput, results, cards);
    updatePlayerOptions();
    renderCards();
    return section;
}

function renderCampaign(campaign, players) {
    document.title = `${campaign.name} | Homebrew Hub`;
    campaignContainer.replaceChildren();

    const title = document.createElement('h1');
    title.textContent = campaign.name;

    const description = document.createElement('p');
    description.textContent = campaign.description;

    const details = document.createElement('dl');
    const fields = [
        ['Campaign ID', campaign.campaign_id],
        ['Dungeon Master', campaign.dm || 'Not specified'],
        ['Character level', campaign.character_level],
        ['Players', campaign.players.length]
    ];

    fields.forEach(([label, value]) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const detail = document.createElement('dd');
        detail.textContent = value;
        details.append(term, detail);
    });

    campaignContainer.append(title, description, details, renderPlayerCards(campaign, players));
}

function renderCampaignList(campaigns) {
    campaignContainer.replaceChildren();

    const heading = document.createElement('h1');
    heading.textContent = 'Campaigns';
    campaignContainer.append(heading);

    if (campaigns.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'No campaigns are available.';
        campaignContainer.append(message);
        return;
    }

    const list = document.createElement('ul');
    campaigns.forEach(campaign => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `?id=${encodeURIComponent(campaign.campaign_id)}`;
        link.textContent = campaign.name || 'Unnamed campaign';
        item.append(link);
        list.append(item);
    });

    campaignContainer.append(list);
}

const campaignForm = document.querySelector('#campaign-form');
const campaignCreateToggle = document.querySelector('#campaign-create-toggle');

if (campaignForm && campaignCreateToggle) {
    campaignCreateToggle.addEventListener('click', () => {
        const isHidden = campaignForm.hidden;
        campaignForm.hidden = !isHidden;
        campaignCreateToggle.setAttribute('aria-expanded', String(isHidden));
        if (isHidden) {
            campaignForm.querySelector('input, textarea')?.focus();
        }
    });

    campaignForm.addEventListener('submit', async event => {
        event.preventDefault();

        const formData = new FormData(campaignForm);
        const players = String(formData.get('campaign-players') || '')
            .split(',')
            .map(player => player.trim())
            .filter(Boolean);
        const newCampaign = {
            name: formData.get('campaign-name'),
            dm: formData.get('campaign-dm'),
            character_level: Number(formData.get('campaign-level')),
            description: formData.get('campaign-description'),
            players
        };

        try {
            const response = await fetch(`${apiBase}/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCampaign)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `Campaign creation failed (${response.status}).`);
            }

            campaignForm.reset();
            campaignForm.hidden = true;
            campaignCreateToggle.setAttribute('aria-expanded', 'false');
            campaignCreateToggle.focus();
            showMessage('Campaign created successfully.');
        } catch (error) {
            console.error(error);
            showMessage('The campaign could not be created. Please try again later.');
        }
    });
}

getCampaigns()
    .then(campaigns => {
        if (!campaignId) {
            renderCampaignList(campaigns);
            return;
        }

        const campaign = campaigns.find(item => item.campaign_id === campaignId);
        if (!campaign) {
            showMessage(`No campaign was found with the ID "${campaignId}".`);
            return;
        }
        return getPlayers().then(players => renderCampaign(campaign, players));
    })
    .catch(error => {
        console.error(error);
        showMessage('The campaign could not be loaded. Please try again later.');
    });
