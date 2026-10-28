// Each entry: { id, name, initiative, isPlayer, isBoss, isVehicle, hp: [number|null, ...], ac: [number|null, ...] }
// hp holds one value per creature in the group (3 goblins -> 3 values)
// Player characters have a single hp value, which is null when no HP was entered
// ac holds one value per individual too (players have one); null means no AC was entered
// Vehicles also carry damageThreshold: one value per individual, damage below it is ignored
// Regular enemies also get identifiers: one optional note per individual ("red cloak", "on the left")
// Monsters keep selected: one flag per individual, marking who the next "Apply Damage" hits
// Bosses also carry legendaryActions and legendaryResistances: { max, current }
let creatures = [];
let nextId = 1;

// Combat state: currentId is the creature whose turn it is (null = not in combat)
// When that creature is in a player group, the whole group is up
let currentId = null;
let round = 1;

const form = document.getElementById("creatureForm");
const list = document.getElementById("initiativeList");
const combatButton = document.getElementById("combatButton");
const roundDisplay = document.getElementById("roundDisplay");
const playerCheckbox = document.getElementById("creatureIsPlayer");
const hpInput = document.getElementById("creatureHp");
const amountInput = document.getElementById("creatureAmount");
const acInput = document.getElementById("creatureAc");
const groupPlayersCheckbox = document.getElementById("groupPlayers");
const bossCheckbox = document.getElementById("creatureIsBoss");
const bossFields = document.getElementById("bossFields");
const legendaryActionsInput = document.getElementById("creatureLegendaryActions");
const legendaryResistancesInput = document.getElementById("creatureLegendaryResistances");
const vehicleCheckbox = document.getElementById("creatureIsVehicle");
const vehicleFields = document.getElementById("vehicleFields");
const damageThresholdInput = document.getElementById("creatureDamageThreshold");

form.addEventListener("submit", function (event)
{
    event.preventDefault();

    const name = document.getElementById("creatureName").value.trim();
    // Initiative can be a decimal so ties can be broken by hand (e.g. 15.5 goes before 15)
    const initiative = parseFloat(document.getElementById("creatureInitiative").value);
    const isPlayer = playerCheckbox.checked;
    const hp = parseInt(hpInput.value);
    const amount = parseInt(amountInput.value);
    const parsedAc = parseInt(acInput.value);
    const ac = isNaN(parsedAc) ? null : Math.max(0, parsedAc);
    const isBoss = bossCheckbox.checked;
    const legendaryActions = parseInt(legendaryActionsInput.value);
    const legendaryResistances = parseInt(legendaryResistancesInput.value);
    const isVehicle = vehicleCheckbox.checked;
    const damageThreshold = parseInt(damageThresholdInput.value);

    if (!name || isNaN(initiative))
    {
        return;
    }

    if (!isPlayer && (isNaN(hp) || isNaN(amount) || amount < 1))
    {
        return;
    }

    if (isVehicle && (isNaN(damageThreshold) || damageThreshold < 0))
    {
        return;
    }

    if (isBoss && (isNaN(legendaryActions) || isNaN(legendaryResistances)
        || legendaryActions < 0 || legendaryResistances < 0))
    {
        return;
    }

    const count = isPlayer || isBoss ? 1 : amount;

    const creature = {
        id: nextId++,
        name: name,
        initiative: initiative,
        isPlayer: isPlayer,
        isBoss: isBoss,
        isVehicle: isVehicle,
        hp: Array(count).fill(isNaN(hp) ? null : hp),
        ac: Array(count).fill(ac)
    };

    if (isVehicle)
    {
        creature.damageThreshold = Array(count).fill(damageThreshold);
    }

    if (!isPlayer)
    {
        creature.selected = Array(count).fill(false);
    }

    if (!isPlayer && !isBoss)
    {
        creature.identifiers = Array(count).fill("");
    }

    if (isBoss)
    {
        creature.legendaryActions = { max: legendaryActions, current: legendaryActions };
        creature.legendaryResistances = { max: legendaryResistances, current: legendaryResistances };
    }

    creatures.push(creature);

    form.reset();
    amountInput.value = 1;
    updateTypeFields();
    document.getElementById("creatureName").focus();

    render();
});

// HP is optional for players, players and bosses are always a single creature, and the
// boss/vehicle fields only show when their box is checked
function updateTypeFields()
{
    const isPlayer = playerCheckbox.checked;
    const isBoss = bossCheckbox.checked;
    const isVehicle = vehicleCheckbox.checked;

    hpInput.required = !isPlayer;
    hpInput.placeholder = isPlayer ? "Optional" : "";
    amountInput.disabled = isPlayer || isBoss;
    amountInput.required = !amountInput.disabled;

    if (amountInput.disabled)
    {
        amountInput.value = 1;
    }

    // A player can't be a boss or a vehicle, and a boss or vehicle can't be a player
    playerCheckbox.disabled = isBoss || isVehicle;
    bossCheckbox.disabled = isPlayer;
    vehicleCheckbox.disabled = isPlayer;

    bossFields.hidden = !isBoss;
    legendaryActionsInput.required = isBoss;
    legendaryResistancesInput.required = isBoss;

    vehicleFields.hidden = !isVehicle;
    damageThresholdInput.required = isVehicle;
}

playerCheckbox.addEventListener("change", updateTypeFields);
bossCheckbox.addEventListener("change", updateTypeFields);
vehicleCheckbox.addEventListener("change", updateTypeFields);
groupPlayersCheckbox.addEventListener("change", render);

document.getElementById("clearButton").addEventListener("click", function ()
{
    creatures = [];
    endCombat();
});

combatButton.addEventListener("click", function ()
{
    if (currentId === null)
    {
        startCombat();
    }
    else
    {
        endCombat();
    }
});

function sortCreatures()
{
    // Highest initiative goes first, and players win ties against non-players
    creatures.sort((a, b) => b.initiative - a.initiative || b.isPlayer - a.isPlayer);
}

// Splits the initiative order into turns. Normally each creature is its own turn, but in
// combat with grouping on, players who go back to back share a single turn.
function getTurns()
{
    const grouping = currentId !== null && groupPlayersCheckbox.checked;
    const turns = [];

    for (const creature of creatures)
    {
        const lastTurn = turns[turns.length - 1];

        if (grouping && creature.isPlayer && lastTurn && lastTurn[0].isPlayer)
        {
            lastTurn.push(creature);
        }
        else
        {
            turns.push([creature]);
        }
    }

    return turns;
}

function findTurnIndex(turns, id)
{
    return turns.findIndex(turn => turn.some(c => c.id === id));
}

function startCombat()
{
    if (creatures.length === 0)
    {
        return;
    }

    sortCreatures();
    round = 1;
    currentId = creatures[0].id;
    render();
}

function endCombat()
{
    currentId = null;
    round = 1;
    render();
}

// Moves to the turn after the one holding the given creature, wrapping to the top for a new round
function advanceFrom(id)
{
    const turns = getTurns();
    const index = findTurnIndex(turns, id);

    if (index === turns.length - 1)
    {
        currentId = turns[0][0].id;
        round++;
    }
    else
    {
        currentId = turns[index + 1][0].id;
    }
}

function nextTurn()
{
    // Bosses get their legendary actions back when their turn ends
    const turns = getTurns();

    for (const creature of turns[findTurnIndex(turns, currentId)])
    {
        if (creature.isBoss)
        {
            creature.legendaryActions.current = creature.legendaryActions.max;
        }
    }

    advanceFrom(currentId);
    render();
}

function removeCreature(id)
{
    if (currentId !== null)
    {
        const turns = getTurns();
        const currentTurn = turns[findTurnIndex(turns, currentId)];

        if (currentTurn.some(c => c.id === id))
        {
            if (currentTurn.length > 1)
            {
                // Someone else in the player group keeps the turn
                currentId = currentTurn.find(c => c.id !== id).id;
            }
            else if (turns.length === 1)
            {
                currentId = null;
                round = 1;
            }
            else
            {
                advanceFrom(id);
            }
        }
    }

    creatures = creatures.filter(c => c.id !== id);
    render();
}

function renderCombatBar()
{
    const inCombat = currentId !== null;

    combatButton.textContent = inCombat ? "End Combat" : "Start Combat";
    combatButton.classList.toggle("initiative-btn-secondary", inCombat);
    combatButton.disabled = !inCombat && creatures.length === 0;

    roundDisplay.textContent = inCombat ? `Round ${round}` : "Not in combat";
    roundDisplay.classList.toggle("active", inCombat);
}

// Editable initiative for one creature; the list re-sorts once the edit is committed
function createInitiativeInput(creature, className)
{
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.className = `${className} initiative-input`;
    input.value = creature.initiative;
    input.title = "Edit initiative";
    input.setAttribute("aria-label", `Initiative for ${creature.name}`);

    const fitText = () => input.classList.toggle("long", input.value.length > 2);
    fitText();
    input.addEventListener("input", fitText);

    input.addEventListener("change", () =>
    {
        const value = parseFloat(input.value);

        if (!isNaN(value))
        {
            creature.initiative = value;
        }

        render();
    });

    input.addEventListener("keydown", event =>
    {
        if (event.key === "Enter")
        {
            input.blur();
        }
    });

    return input;
}

function createInitiativeBadge(value)
{
    const badge = document.createElement("span");
    badge.className = "initiative";
    badge.textContent = value;
    return badge;
}

function createRemoveButton(id)
{
    const removeButton = document.createElement("button");
    removeButton.className = "creature-remove";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeCreature(id));
    return removeButton;
}

function createNextButton()
{
    const nextButton = document.createElement("button");
    nextButton.className = "creature-next";
    nextButton.type = "button";
    nextButton.textContent = "Next →";
    nextButton.addEventListener("click", nextTurn);
    return nextButton;
}

function createPlayerTag()
{
    const tag = document.createElement("span");
    tag.className = "creature-tag";
    tag.textContent = "PC";
    return tag;
}

function createBossTag()
{
    const tag = document.createElement("span");
    tag.className = "creature-tag boss-tag";
    tag.textContent = "BOSS";
    return tag;
}

function createCounterButton(text, label, disabled, onClick)
{
    const button = document.createElement("button");
    button.className = "legendary-btn";
    button.type = "button";
    button.textContent = text;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    button.addEventListener("click", () =>
    {
        onClick();
        render();
    });
    return button;
}

// One row of pips with -/+ buttons for a { max, current } counter
function renderLegendaryTracker(title, counter)
{
    const tracker = document.createElement("div");
    tracker.className = "legendary-tracker";

    const label = document.createElement("span");
    label.className = "legendary-label";
    label.textContent = title;

    const pips = document.createElement("span");
    pips.className = "legendary-pips";

    for (let i = 0; i < counter.max; i++)
    {
        const pip = document.createElement("span");
        pip.className = "legendary-pip";
        pip.classList.toggle("spent", i >= counter.current);
        pips.appendChild(pip);
    }

    const count = document.createElement("span");
    count.className = "legendary-count";
    count.textContent = `${counter.current} / ${counter.max}`;

    const minus = createCounterButton("−", `Use one ${title}`, counter.current <= 0,
        () => counter.current--);
    const plus = createCounterButton("+", `Restore one ${title}`, counter.current >= counter.max,
        () => counter.current++);

    tracker.append(label, pips, count, minus, plus);
    return tracker;
}

// A labelled number input for one stat (HP or AC); onChange gets the parsed value (NaN when blank)
function createStatField(labelText, value, onChange)
{
    const field = document.createElement("label");
    field.className = "stat-field";

    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "number";
    input.value = value === null ? "" : value;
    input.placeholder = "—";

    // Save edits back so they survive re-renders
    input.addEventListener("input", () => onChange(parseInt(input.value)));

    field.append(label, input);
    return field;
}

function createAcField(creature, index)
{
    const field = createStatField("AC", creature.ac[index], value =>
    {
        // AC can't go below 0
        if (value < 0)
        {
            value = 0;
            input.value = 0;
        }

        creature.ac[index] = isNaN(value) ? null : value;
    });
    field.classList.add("stat-ac");

    const input = field.querySelector("input");
    input.min = 0;
    return field;
}

function createHpField(creature, index, box)
{
    const isDown = () => creature.hp[index] !== null && creature.hp[index] <= 0;

    const field = createStatField("HP", creature.hp[index], value =>
    {
        // Players can leave HP blank; monsters treat a blank as 0
        creature.hp[index] = isNaN(value) ? (creature.isPlayer ? null : 0) : value;
        box.classList.toggle("down", isDown());
    });
    field.classList.add("stat-hp");

    box.classList.toggle("down", isDown());
    return field;
}

function createDamageThresholdField(creature, index)
{
    const field = createStatField("DT", creature.damageThreshold[index], value =>
    {
        // Damage threshold can't go below 0
        if (value < 0)
        {
            value = 0;
            input.value = 0;
        }

        creature.damageThreshold[index] = isNaN(value) ? 0 : value;
    });
    field.classList.add("stat-dt");
    field.title = "Damage Threshold";

    const input = field.querySelector("input");
    input.min = 0;
    return field;
}

// Subtracts damage from the selected individuals, or from the only one if there's just one.
// Vehicles ignore damage below their damage threshold, but take all of it if it meets or beats it.
// HP never drops below 0, and the selection is cleared once the damage lands.
function applyDamage(creature, damage)
{
    const single = creature.hp.length === 1;
    let hit = 0;
    let blocked = 0;

    creature.hp.forEach((hp, index) =>
    {
        if (!single && !creature.selected[index])
        {
            return;
        }

        hit++;

        if (creature.isVehicle && damage < creature.damageThreshold[index])
        {
            blocked++;
            return;
        }

        creature.hp[index] = Math.max(0, hp - damage);
    });

    if (blocked > 0)
    {
        creature.damageNote = single
            ? `No damage: ${damage} is below the damage threshold of ${creature.damageThreshold[0]}.`
            : `${blocked} of ${hit} took no damage (below their damage threshold).`;
    }

    creature.selected.fill(false);
    render();
}

function renderDamageRow(creature)
{
    const row = document.createElement("div");
    row.className = "damage-row";

    const input = document.createElement("input");
    input.type = "number";
    input.min = 0;
    input.className = "damage-input";
    input.placeholder = "Damage";
    input.setAttribute("aria-label", `Damage to ${creature.name}`);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "damage-btn";
    button.textContent = creature.hp.length > 1 ? "Apply Damage to Selected" : "Apply Damage";

    // Shows the result of the last hit (like a blocked vehicle) once, then clears it
    const hint = document.createElement("span");
    hint.className = "damage-hint";
    hint.textContent = creature.damageNote || "";
    creature.damageNote = "";

    const apply = () =>
    {
        const damage = parseInt(input.value);

        if (isNaN(damage) || damage <= 0)
        {
            input.focus();
            return;
        }

        if (creature.hp.length > 1 && !creature.selected.includes(true))
        {
            hint.textContent = "Tick the ones that got hit first.";
            return;
        }

        applyDamage(creature, damage);
    };

    button.addEventListener("click", apply);
    input.addEventListener("keydown", event =>
    {
        if (event.key === "Enter")
        {
            apply();
        }
    });

    row.append(input, button, hint);
    return row;
}

function renderCreatureCard(creature, isCurrent)
{
    const card = document.createElement("div");
    card.className = "creature";
    card.classList.toggle("player", creature.isPlayer);
    card.classList.toggle("boss", creature.isBoss);
    card.classList.toggle("vehicle", creature.isVehicle);
    card.classList.toggle("current-turn", isCurrent);

    const header = document.createElement("div");
    header.className = "creature-header";

    const name = document.createElement("h3");
    name.className = "creature-name";
    name.textContent = creature.name;

    if (creature.isPlayer)
    {
        name.appendChild(createPlayerTag());
    }

    if (creature.isBoss)
    {
        name.appendChild(createBossTag());
    }

    if (creature.isVehicle)
    {
        const tag = document.createElement("span");
        tag.className = "creature-tag vehicle-tag";
        tag.textContent = "VEHICLE";
        name.appendChild(tag);
    }

    if (creature.hp.length > 1)
    {
        const count = document.createElement("span");
        count.className = "creature-count";
        count.textContent = `x${creature.hp.length}`;
        name.appendChild(count);
    }

    header.append(createInitiativeInput(creature, "initiative"), name);

    if (isCurrent)
    {
        header.appendChild(createNextButton());
    }

    header.appendChild(createRemoveButton(creature.id));
    card.appendChild(header);

    const hpList = document.createElement("div");
    hpList.className = "hp-list";

    creature.ac.forEach((ac, index) =>
    {
        const box = document.createElement("div");
        box.className = "hp-box";

        if (creature.ac.length > 1)
        {
            // In a group, each individual can be picked as a damage target
            const select = document.createElement("label");
            select.className = "hp-box-select";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = creature.selected[index];
            checkbox.addEventListener("change", () =>
            {
                creature.selected[index] = checkbox.checked;
                box.classList.toggle("selected", checkbox.checked);
            });

            const label = document.createElement("span");
            label.className = "hp-box-name";
            label.textContent = `${creature.name} ${index + 1}`;

            box.classList.toggle("selected", creature.selected[index]);
            select.append(checkbox, label);
            box.appendChild(select);
        }

        box.append(createHpField(creature, index, box), createAcField(creature, index));

        if (creature.isVehicle)
        {
            box.appendChild(createDamageThresholdField(creature, index));
        }

        if (creature.identifiers)
        {
            const identifier = document.createElement("input");
            identifier.type = "text";
            identifier.className = "hp-box-identifier";
            identifier.placeholder = "Identifier";
            identifier.value = creature.identifiers[index];
            identifier.setAttribute("aria-label", `Identifier for ${creature.name} ${index + 1}`);

            // Save edits back so they survive re-renders
            identifier.addEventListener("input", () =>
            {
                creature.identifiers[index] = identifier.value;
            });

            box.appendChild(identifier);
        }

        hpList.appendChild(box);
    });

    card.appendChild(hpList);

    if (!creature.isPlayer)
    {
        card.appendChild(renderDamageRow(creature));
    }

    if (creature.isBoss && (creature.legendaryActions.max > 0 || creature.legendaryResistances.max > 0))
    {
        const legendary = document.createElement("div");
        legendary.className = "legendary-list";

        if (creature.legendaryActions.max > 0)
        {
            legendary.appendChild(renderLegendaryTracker("Legendary Actions", creature.legendaryActions));
        }

        if (creature.legendaryResistances.max > 0)
        {
            legendary.appendChild(renderLegendaryTracker("Legendary Resistances", creature.legendaryResistances));
        }

        card.appendChild(legendary);
    }

    return card;
}

function renderPlayerGroupCard(players, isCurrent)
{
    const card = document.createElement("div");
    card.className = "creature player player-group";
    card.classList.toggle("current-turn", isCurrent);

    const header = document.createElement("div");
    header.className = "creature-header";

    const name = document.createElement("h3");
    name.className = "creature-name";
    name.textContent = "Player Group";

    const count = document.createElement("span");
    count.className = "creature-count";
    count.textContent = `${players.length} players`;
    name.appendChild(count);

    header.append(createInitiativeBadge(players[0].initiative), name);

    if (isCurrent)
    {
        header.appendChild(createNextButton());
    }

    const members = document.createElement("ul");
    members.className = "player-group-members";

    for (const player of players)
    {
        const member = document.createElement("li");
        member.className = "player-group-member";

        const memberInitiative = createInitiativeInput(player, "player-group-initiative");

        const memberName = document.createElement("span");
        memberName.className = "player-group-name";
        memberName.textContent = player.name;

        member.append(memberInitiative, memberName, createHpField(player, 0, member), createAcField(player, 0));

        member.appendChild(createRemoveButton(player.id));
        members.appendChild(member);
    }

    card.append(header, members);
    return card;
}

function render()
{
    sortCreatures();

    list.innerHTML = "";
    renderCombatBar();

    if (creatures.length === 0)
    {
        const empty = document.createElement("p");
        empty.className = "initiative-empty";
        empty.textContent = "No creatures yet. Add one above to start the encounter.";
        list.appendChild(empty);
        return;
    }

    for (const turn of getTurns())
    {
        const isCurrent = turn.some(c => c.id === currentId);

        const card = turn.length > 1
            ? renderPlayerGroupCard(turn, isCurrent)
            : renderCreatureCard(turn[0], isCurrent);

        list.appendChild(card);
    }
}

updateTypeFields();
render();
