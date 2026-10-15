const campaignContainer = document.getElementById('campaign-portfolio');
const campaignId = new URLSearchParams(window.location.search).get('id');

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

if (!campaignId) {
    showMessage('No campaign ID was provided. Add ?id=<campaign-id> to the URL.');
} else {
    fetch('../Data/campaigns.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Campaign data request failed (${response.status}).`);
            }
            return response.json();
        })
        .then(campaigns => {
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
}
