const spellContainer = document.getElementById('campaign-portfolio');
const spellName = new URLSearchParams(window.location.search).get('name');

function showMessage(message) {
    spellContainer.textContent = message;
}

function renderSpell (spell) {
    document.title = `${spell.name} | Homebrew Hub`;
    spellContainer.replaceChildren();

    const title = document.createElement('h1');
    title.textContent = spell.name;

    const description = document.createElement('p');
    description.textContent = spell.description || spell.desc || '';

    const details = document.createElement('dl');
    const fields = [
        ['Level', spell.level ?? spell.spell_level],
        ['School', spell.school],
        ['Casting time', spell.casting_time],
        ['Range', spell.range],
        ['Components', spell.components],
        ['Duration', spell.duration]
    ];

    fields.forEach(([label, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        const term = document.createElement('dt');
        term.textContent = label;
        const detail = document.createElement('dd');
        detail.textContent = value;
        details.append(term, detail);
    });

    spellContainer.append(title, description, details);
}

if (!spellName) {
    showMessage('No spell name was provided. Add ?name=<spell-name> to the URL.');
} else {
    fetch('../Data/spells.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Spell data request failed (${response.status}).`);
            }
            return response.json();
        })
        .then(spells => {
            const spell = spells.find(item =>
                item.name && item.name.toLowerCase() === spellName.toLowerCase()
            );
            if (!spell) {
                showMessage(`No spell was found with the name "${spellName}".`);
                return;
            }
            renderSpell(spell);
        })
        .catch(error => {
            console.error(error);
            showMessage('The spell could not be loaded. Please try again later.');
        });
}
