// Each entry: { id, name, initiative, isPlayer, isBoss, isVehicle, hp: [number|null, ...], ac: [number|null, ...] }
// hp holds one value per creature in the group (3 goblins -> 3 values)
// Player characters have a single hp value, which is null when no HP was entered
// ac holds one value per individual too (players have one); null means no AC was entered
// Vehicles also carry damageThreshold: one value per individual, damage below it is ignored
// type and size come from the 5e lists in the form (type can also be custom text, e.g. "Fiend (Demon)")
// isPlayerControlled marks summons, companions and the like: they work like regular creatures
// (groups, HP, damage) but are on the players' side, so they're purple and win ties like players
// Regular enemies also get identifiers: one optional note per individual ("red cloak", "on the left")
// Monsters keep selected: one flag per individual, marking who the next "Apply Damage" hits
// Bosses also carry legendaryActions and legendaryResistances: { max, current }
// Players imported from a campaign also carry playerId, className and level, and start with
// initiative null until it's typed in (combat can't start while anyone is still waiting on one)
// Lairs are their own kind of entry: always named "Lair" on initiative 20, no HP/AC, and they carry
// lairActions: [{ identifier, usedRound }]. A used action comes back two rounds later (used on 1 -> back on 3)
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
const playerControlledCheckbox = document.getElementById("creatureIsPlayerControlled");
const typeSelect = document.getElementById("creatureType");
const customTypeInput = document.getElementById("creatureCustomType");
const sizeSelect = document.getElementById("creatureSize");
const nameInput = document.getElementById("creatureName");
const initiativeInput = document.getElementById("creatureInitiative");
const lairCheckbox = document.getElementById("creatureIsLair");
const lairFields = document.getElementById("lairFields");
const lairActionsInput = document.getElementById("creatureLairActions");

const campaignSelect = document.getElementById("campaignSelect");
const importPartyButton = document.getElementById("importPartyButton");
const partyImportStatus = document.getElementById("partyImportStatus");

// Same API as the Campaigns page: Live Server (port 5500) talks to server.py on 8000
const apiBase = window.location.port === "5500"
    ? "http://localhost:8000/api"
    : "../api";

let campaigns = [];

const LAIR_NAME = "Lair";
const LAIR_INITIATIVE = 20;

// Clears the form back to its defaults after adding something
function resetForm()
{
    form.reset();
    amountInput.value = 1;
    updateTypeFields();
    updateCustomType();
    nameInput.focus();

    render();
}

function addLair()
{
    const actionCount = parseInt(lairActionsInput.value);

    if (isNaN(actionCount) || actionCount < 1)
    {
        return;
    }

    creatures.push({
        id: nextId++,
        name: LAIR_NAME,
        initiative: LAIR_INITIATIVE,
        isLair: true,
        lairActions: Array.from({ length: actionCount }, () => ({ identifier: "", usedRound: null }))
    });

    resetForm();
}

form.addEventListener("submit", function (event)
{
    event.preventDefault();

    if (lairCheckbox.checked)
    {
        addLair();
        return;
    }

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
    const isPlayerControlled = playerControlledCheckbox.checked;
    const isCustomType = typeSelect.value === "custom";
    const type = isCustomType ? customTypeInput.value.trim() : typeSelect.value;
    // Damage threshold is optional and defaults to 0
    const parsedThreshold = parseInt(damageThresholdInput.value);
    const damageThreshold = isNaN(parsedThreshold) ? 0 : Math.max(0, parsedThreshold);

    if (!name || isNaN(initiative) || !type)
    {
        return;
    }

    if (!isPlayer && (isNaN(hp) || isNaN(amount) || amount < 1))
    {
        return;
    }

    // Everyone except players must have an AC
    if (!isPlayer && ac === null)
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
        isPlayerControlled: isPlayerControlled,
        type: type,
        isCustomType: isCustomType,
        size: sizeSelect.value,
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
    resetForm();
});

// HP is optional for players, players and bosses are always a single creature, and the
// boss/vehicle fields only show when their box is checked
function updateTypeFields()
{
    const isPlayer = playerCheckbox.checked;
    const isBoss = bossCheckbox.checked;
    const isVehicle = vehicleCheckbox.checked;
    const isPlayerControlled = playerControlledCheckbox.checked;
    const isLair = lairCheckbox.checked;

    // A lair has a fixed name and initiative and no stats, so lock all of that while it's checked
    if (isLair)
    {
        nameInput.value = LAIR_NAME;
        initiativeInput.value = LAIR_INITIATIVE;
        hpInput.value = "";
        acInput.value = "";
    }
    else if (nameInput.disabled)
    {
        // Just unticked Lair: clear the locked values out
        nameInput.value = "";
        initiativeInput.value = "";
    }

    for (const input of [nameInput, initiativeInput, hpInput, acInput, typeSelect, customTypeInput, sizeSelect])
    {
        input.disabled = isLair;
    }

    lairFields.hidden = !isLair;
    lairActionsInput.required = isLair;

    hpInput.required = !isPlayer;
    hpInput.placeholder = isPlayer ? "Optional" : "";
    acInput.placeholder = isPlayer ? "Optional" : "";
    // AC is only optional for players
    acInput.required = !isPlayer;
    amountInput.disabled = isPlayer || isBoss || isLair;
    amountInput.required = !amountInput.disabled;

    if (amountInput.disabled)
    {
        amountInput.value = 1;
    }

    // Players can't be anything else, player-controlled creatures can't be bosses,
    // vehicles can't be bosses either, and a lair can't be anything else
    playerCheckbox.disabled = isBoss || isVehicle || isPlayerControlled || isLair;
    playerControlledCheckbox.disabled = isPlayer || isBoss || isLair;
    bossCheckbox.disabled = isPlayer || isVehicle || isPlayerControlled || isLair;
    vehicleCheckbox.disabled = isPlayer || isBoss || isLair;
    lairCheckbox.disabled = isPlayer || isPlayerControlled || isVehicle || isBoss;

    bossFields.hidden = !isBoss;
    legendaryActionsInput.required = isBoss;
    legendaryResistancesInput.required = isBoss;

    vehicleFields.hidden = !isVehicle;
}

playerCheckbox.addEventListener("change", updateTypeFields);
bossCheckbox.addEventListener("change", updateTypeFields);
vehicleCheckbox.addEventListener("change", updateTypeFields);
playerControlledCheckbox.addEventListener("change", updateTypeFields);
lairCheckbox.addEventListener("change", updateTypeFields);

// The custom type box only shows (and is only required) when "Custom..." is picked
function updateCustomType()
{
    const isCustom = typeSelect.value === "custom";

    customTypeInput.hidden = !isCustom;
    customTypeInput.required = isCustom;

    if (!isCustom)
    {
        customTypeInput.value = "";
    }
}

typeSelect.addEventListener("change", () =>
{
    updateCustomType();

    if (typeSelect.value === "custom")
    {
        customTypeInput.focus();
    }
});
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
    // Highest initiative goes first, and anyone still waiting on initiative sits at the bottom.
    // On ties the players' side (players and the creatures they control) goes first, and lairs go last
    const initiativeOf = c => c.initiative === null ? -Infinity : c.initiative;
    const tiePriority = c => c.isPlayer || c.isPlayerControlled ? 1 : (c.isLair ? -1 : 0);
    creatures.sort((a, b) => (initiativeOf(b) - initiativeOf(a)) || tiePriority(b) - tiePriority(a));
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

function countMissingInitiative()
{
    return creatures.filter(c => c.initiative === null).length;
}

function startCombat()
{
    if (creatures.length === 0 || countMissingInitiative() > 0)
    {
        return;
    }

    sortCreatures();
    round = 1;
    currentId = creatures[0].id;

    // Every lair action starts the fight ready to use
    for (const creature of creatures)
    {
        if (creature.isLair)
        {
            creature.lairActions.forEach(action => action.usedRound = null);
        }
    }

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
    const missing = countMissingInitiative();
    combatButton.disabled = !inCombat && (creatures.length === 0 || missing > 0);

    if (inCombat)
    {
        roundDisplay.textContent = `Round ${round}`;
    }
    else if (missing > 0)
    {
        roundDisplay.textContent = `Waiting on initiative for ${missing}`;
    }
    else
    {
        roundDisplay.textContent = "Not in combat";
    }

    roundDisplay.classList.toggle("active", inCombat);
}

// Editable initiative for one creature; the list re-sorts once the edit is committed
function createInitiativeInput(creature, className)
{
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.className = `${className} initiative-input`;
    input.value = creature.initiative === null ? "" : creature.initiative;
    input.placeholder = "?";
    input.classList.toggle("needs-initiative", creature.initiative === null);

    if (creature.dexModifier !== undefined && creature.dexModifier !== null)
    {
        const sign = creature.dexModifier >= 0 ? "+" : "";
        input.title = `Edit initiative (DEX ${sign}${creature.dexModifier})`;
    }
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
    card.classList.toggle("player-controlled", creature.isPlayerControlled);
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

    if (creature.isPlayerControlled)
    {
        const tag = document.createElement("span");
        tag.className = "creature-tag player-controlled-tag";
        tag.textContent = "PLAYER CONTROLLED";
        name.appendChild(tag);
    }

    // Stat block style line, e.g. "Medium humanoid"; imported players show their class instead
    const details = document.createElement("span");
    details.className = "creature-meta";
    details.textContent = creature.className
        ? `${creature.className}, level ${creature.level}`
        : `${creature.size} ${creature.isCustomType ? creature.type : creature.type.toLowerCase()}`;

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

    name.appendChild(details);
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

// A used lair action comes back on the round after next (used on round 1 -> available on round 3)
function isLairActionAvailable(action)
{
    return action.usedRound === null || round >= action.usedRound + 2;
}

// Green AVAILABLE / red USED switch; clicking an available action spends it this round,
// clicking a used one puts it back (for mis-clicks)
function createLairActionToggle(action)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lair-toggle";

    const available = isLairActionAvailable(action);
    button.classList.toggle("available", available);
    button.textContent = available ? "AVAILABLE" : `USED — back round ${action.usedRound + 2}`;
    button.title = available ? "Click to use this round" : "Click to undo";

    button.addEventListener("click", () =>
    {
        action.usedRound = isLairActionAvailable(action) ? round : null;
        render();
    });

    return button;
}

function renderLairCard(lair, isCurrent)
{
    const card = document.createElement("div");
    card.className = "creature lair";
    card.classList.toggle("current-turn", isCurrent);

    const header = document.createElement("div");
    header.className = "creature-header";

    const name = document.createElement("h3");
    name.className = "creature-name";
    name.textContent = lair.name;

    const tag = document.createElement("span");
    tag.className = "creature-tag lair-tag";
    tag.textContent = "LAIR";
    name.appendChild(tag);

    // Lair initiative is locked, so it gets a plain badge instead of an editable one
    header.append(createInitiativeBadge(lair.initiative), name);

    if (isCurrent)
    {
        header.appendChild(createNextButton());
    }

    header.appendChild(createRemoveButton(lair.id));

    const actions = document.createElement("ol");
    actions.className = "lair-actions";

    lair.lairActions.forEach((action, index) =>
    {
        const row = document.createElement("li");
        row.className = "lair-action";

        const number = document.createElement("span");
        number.className = "lair-action-number";
        number.textContent = index + 1;

        const identifier = document.createElement("input");
        identifier.type = "text";
        identifier.className = "hp-box-identifier lair-action-identifier";
        identifier.placeholder = "Identifier";
        identifier.value = action.identifier;
        identifier.setAttribute("aria-label", `Identifier for lair action ${index + 1}`);

        // Save edits back so they survive re-renders
        identifier.addEventListener("input", () =>
        {
            action.identifier = identifier.value;
        });

        row.append(number, identifier, createLairActionToggle(action));
        actions.appendChild(row);
    });

    card.append(header, actions);
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

        let card;

        if (turn.length > 1)
        {
            card = renderPlayerGroupCard(turn, isCurrent);
        }
        else if (turn[0].isLair)
        {
            card = renderLairCard(turn[0], isCurrent);
        }
        else
        {
            card = renderCreatureCard(turn[0], isCurrent);
        }


        list.appendChild(card);
    }
}

// ── Party import ──────────────────────────────────────────────

async function fetchJson(path)
{
    const response = await fetch(`${apiBase}/${path}`);

    if (!response.ok)
    {
        throw new Error(`Request for ${path} failed (${response.status}).`);
    }

    return response.json();
}

async function loadCampaigns()
{
    try
    {
        campaigns = await fetchJson("campaigns");
    }
    catch (error)
    {
        console.error(error);
        campaignSelect.replaceChildren(new Option("Campaigns unavailable", ""));
        partyImportStatus.textContent = "Couldn't load campaigns. Make sure server.py is running.";
        return;
    }

    campaignSelect.replaceChildren(new Option("Select a campaign...", ""));

    for (const campaign of campaigns)
    {
        const count = Array.isArray(campaign.players) ? campaign.players.length : 0;
        const label = `${campaign.name || "Unnamed campaign"} (${count} player${count === 1 ? "" : "s"})`;
        campaignSelect.appendChild(new Option(label, campaign.campaign_id));
    }

    campaignSelect.disabled = campaigns.length === 0;

    if (campaigns.length === 0)
    {
        partyImportStatus.textContent = "No campaigns to import from yet.";
    }
}

// The DEX modifier is the usual initiative bonus, so it's shown as a hint on the empty box
function dexModifier(player)
{
    const dexterity = player.attributes && Number(player.attributes.dexterity);
    return isNaN(dexterity) ? null : Math.floor((dexterity - 10) / 2);
}

function toNumberOrNull(value)
{
    const number = parseInt(value);
    return isNaN(number) ? null : Math.max(0, number);
}

// Adds every player in the campaign as a Player Character with their HP and AC filled in.
// Anyone already in the tracker (matched by player id) is skipped so importing twice is safe.
async function importParty()
{
    const campaign = campaigns.find(c => c.campaign_id === campaignSelect.value);

    if (!campaign)
    {
        return;
    }

    importPartyButton.disabled = true;
    partyImportStatus.textContent = "Importing party...";

    try
    {
        const players = await fetchJson("players");
        const playerIds = Array.isArray(campaign.players) ? campaign.players : [];
        let added = 0;
        let skipped = 0;
        const missing = [];

        for (const playerId of playerIds)
        {
            if (creatures.some(c => c.playerId === playerId))
            {
                skipped++;
                continue;
            }

            const player = players.find(p => p.player_id === playerId);

            if (!player)
            {
                missing.push(playerId);
                continue;
            }

            creatures.push({
                id: nextId++,
                playerId: playerId,
                name: player.character_name || player.name,
                initiative: null,
                dexModifier: dexModifier(player),
                isPlayer: true,
                isBoss: false,
                isVehicle: false,
                isPlayerControlled: false,
                type: "Humanoid",
                isCustomType: false,
                size: "Medium",
                className: player.class,
                level: player.level,
                hp: [toNumberOrNull(player.max_hp)],
                ac: [toNumberOrNull(player.ac)]
            });
            added++;
        }

        const parts = [`Added ${added} player${added === 1 ? "" : "s"} from ${campaign.name}.`];

        if (skipped > 0)
        {
            parts.push(`${skipped} already in the tracker.`);
        }

        if (missing.length > 0)
        {
            parts.push(`Couldn't find: ${missing.join(", ")}.`);
        }

        if (added > 0)
        {
            parts.push("Type in their initiatives to start combat.");
        }

        partyImportStatus.textContent = parts.join(" ");
        render();
    }
    catch (error)
    {
        console.error(error);
        partyImportStatus.textContent = "Couldn't load the players. Make sure server.py is running.";
    }
    finally
    {
        importPartyButton.disabled = !campaignSelect.value;
    }
}

campaignSelect.addEventListener("change", () =>
{
    importPartyButton.disabled = !campaignSelect.value;
    partyImportStatus.textContent = "";
});

importPartyButton.addEventListener("click", importParty);

updateTypeFields();
updateCustomType();
render();
loadCampaigns();
