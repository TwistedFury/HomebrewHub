// Each entry: { id, name, initiative, hp: [number, ...] }
// hp holds one value per creature in the group (3 goblins -> 3 values)
let creatures = [];
let nextId = 1;

const form = document.getElementById("creatureForm");
const list = document.getElementById("initiativeList");

form.addEventListener("submit", function (event)
{
    event.preventDefault();

    const name = document.getElementById("creatureName").value.trim();
    const initiative = parseInt(document.getElementById("creatureInitiative").value);
    const hp = parseInt(document.getElementById("creatureHp").value);
    const amount = parseInt(document.getElementById("creatureAmount").value);

    if (!name || isNaN(initiative) || isNaN(hp) || isNaN(amount) || amount < 1)
    {
        return;
    }

    creatures.push({
        id: nextId++,
        name: name,
        initiative: initiative,
        hp: Array(amount).fill(hp)
    });

    form.reset();
    document.getElementById("creatureAmount").value = 1;
    document.getElementById("creatureName").focus();

    render();
});

document.getElementById("clearButton").addEventListener("click", function ()
{
    creatures = [];
    render();
});

function removeCreature(id)
{
    creatures = creatures.filter(c => c.id !== id);
    render();
}

function render()
{
    // Highest initiative goes first
    creatures.sort((a, b) => b.initiative - a.initiative);

    list.innerHTML = "";

    for (const creature of creatures)
    {
        const card = document.createElement("div");
        card.className = "creature";

        const header = document.createElement("div");
        header.className = "creature-header";

        const initiative = document.createElement("span");
        initiative.className = "initiative";
        initiative.textContent = creature.initiative;

        const name = document.createElement("strong");
        name.textContent = creature.hp.length > 1
            ? `${creature.name} (x${creature.hp.length})`
            : creature.name;

        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => removeCreature(creature.id));

        header.append(initiative, name, removeButton);

        const hpList = document.createElement("div");
        hpList.className = "hp-list";

        creature.hp.forEach((hp, index) =>
        {
            const box = document.createElement("label");
            box.className = "hp-box";

            const label = document.createElement("span");
            label.textContent = creature.hp.length > 1
                ? `${creature.name} ${index + 1}`
                : "HP";

            const input = document.createElement("input");
            input.type = "number";
            input.value = hp;

            // Save edits back so they survive re-renders
            input.addEventListener("input", () =>
            {
                const value = parseInt(input.value);
                creature.hp[index] = isNaN(value) ? 0 : value;
                box.classList.toggle("down", creature.hp[index] <= 0);
            });

            box.classList.toggle("down", hp <= 0);
            box.append(label, input);
            hpList.appendChild(box);
        });

        card.append(header, hpList);
        list.appendChild(card);
    }
}
