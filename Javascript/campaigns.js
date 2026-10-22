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

function showMessage(message) {
    campaignContainer.textContent = message;
}

function renderCampaign(campaign) {
    document.title = `${campaign.name} | Homebrew Hub`;
    campaignContainer.replaceChildren();

    const title = document.createElement('h1');
    title.textContent = campaign.name;

    const description = document.createElement('p');
    description.textContent = campaign.description;

    const details = document.createElement('dl');
    const fields = [
        ['Campaign ID', campaign.campaign_id],
        ['Character level', campaign.character_level],
        ['Players', campaign.player_count]
    ];

    fields.forEach(([label, value]) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const detail = document.createElement('dd');
        detail.textContent = value;
        details.append(term, detail);
    });

    campaignContainer.append(title, description, details);
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

if (campaignForm) {
    campaignForm.addEventListener('submit', async event => {
        event.preventDefault();

        const formData = new FormData(campaignForm);
        const newCampaign = {
            name: formData.get('campaign-name'),
            dm: formData.get('campaign-dm'),
            character_level: Number(formData.get('campaign-level')),
            description: formData.get('campaign-description'),
            player_count: formData.get('campaign-players')
                .split(',')
                .map(player => player.trim())
                .filter(Boolean)
                .length
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
        renderCampaign(campaign);
    })
    .catch(error => {
        console.error(error);
        showMessage('The campaign could not be loaded. Please try again later.');
    });
