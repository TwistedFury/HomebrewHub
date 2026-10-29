// Cyberpunk version of the initiative tracker (see initiative.js for the D&D one)
//
// Each entry: { id, name, initiative, isPlayer, isBoss, isVehicle,
//               hp: [number|null, ...], spHead: [number|null, ...], spBody: [number|null, ...] }
// hp holds one value per creature in the group (3 gangers -> 3 values). For vehicles it's their SDP.
// Player characters have a single hp value, which is null when no HP was entered
// spHead / spBody hold stopping power per individual; null means none was entered (counts as 0)
// Vehicles only have one SP, kept in spBody (their spHead is unused)
// Regular enemies also get identifiers: one optional note per individual ("red jacket", "on the left")
// Non-players keep selected: one flag per individual, marking who the next "Apply Damage" hits
// Enemies (not players or vehicles) carry quickInfo: { evasion, combat, move } and canDodge: [bool, ...]
// Bosses are always a single enemy and get their own tag and colour so they stand out
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
const hpLabel = document.getElementById("creatureHpLabel");
const amountInput = document.getElementById("creatureAmount");
const spHeadField = document.getElementById("spHeadField");
const spHeadInput = document.getElementById("creatureSpHead");
const spBodyInput = document.getElementById("creatureSpBody");
const spBodyLabel = document.getElementById("creatureSpBodyLabel");
const groupPlayersCheckbox = document.getElementById("groupPlayers");
const bossCheckbox = document.getElementById("creatureIsBoss");
const vehicleCheckbox = document.getElementById("creatureIsVehicle");
const quickInfoFields = document.getElementById("quickInfoFields");
const evasionInput = document.getElementById("creatureEvasion");
const combatInput = document.getElementById("creatureCombat");
const moveInput = document.getElementById("creatureMove");
const dodgeCheckbox = document.getElementById("creatureCanDodge");

// Blank number boxes become null; stats like SP can't go below 0
function parseOptional(input)
{
    const value = parseInt(input.value);
    return isNaN(value) ? null : Math.max(0, value);
}

form.addEventListener("submit", function (event)
{
    event.preventDefault();

    const name = document.getElementById("creatureName").value.trim();
    // Initiative can be a decimal so ties can be broken by hand (e.g. 15.5 goes before 15)
    const initiative = parseFloat(document.getElementById("creatureInitiative").value);
    const isPlayer = playerCheckbox.checked;
    const hp = parseInt(hpInput.value);
    const amount = parseInt(amountInput.value);
    const spHead = parseOptional(spHeadInput);
    const spBody = parseOptional(spBodyInput);
    const isBoss = bossCheckbox.checked;
    const isVehicle = vehicleCheckbox.checked;

    if (!name || isNaN(initiative))
    {
        return;
    }

    if (!isPlayer && (isNaN(hp) || isNaN(amount) || amount < 1))
    {
        return;
    }

    // Vehicles must have SDP (checked above) and SP
    if (isVehicle && spBody === null)
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
        spHead: Array(count).fill(isVehicle ? null : spHead),
        spBody: Array(count).fill(spBody)
    };

    if (!isPlayer)
    {
        creature.selected = Array(count).fill(false);
        creature.damageOptions = { location: "body", armorPiercing: false, rubber: false };
    }

    if (!isPlayer && !isBoss)
    {
        creature.identifiers = Array(count).fill("");
    }

    if (!isPlayer && !isVehicle)
    {
        creature.quickInfo = {
            evasion: parseOptional(evasionInput),
            combat: parseOptional(combatInput),
            move: parseOptional(moveInput)
        };
        creature.canDodge = Array(count).fill(dodgeCheckbox.checked);
    }

    creatures.push(creature);

    form.reset();
    amountInput.value = 1;
    updateTypeFields();
    document.getElementById("creatureName").focus();

    render();
});

// HP is optional for players, players and bosses are always a single creature, vehicles swap
// HP/SP for SDP and a single required SP, and the extra field groups only show when they apply
function updateTypeFields()
{
    const isPlayer = playerCheckbox.checked;
    const isBoss = bossCheckbox.checked;
    const isVehicle = vehicleCheckbox.checked;

    hpInput.required = !isPlayer;
    hpInput.placeholder = isPlayer ? "Optional" : "";
    hpLabel.textContent = isVehicle ? "SDP" : "HP";
    amountInput.disabled = isPlayer || isBoss;
    amountInput.required = !amountInput.disabled;

    if (amountInput.disabled)
    {
        amountInput.value = 1;
    }

    spHeadField.hidden = isVehicle;
    spBodyLabel.textContent = isVehicle ? "SP" : "SP (Body)";
    spBodyInput.required = isVehicle;
    spBodyInput.placeholder = isVehicle ? "" : "Optional";
    spHeadInput.placeholder = "Optional";

    // A player can't be a boss or a vehicle, and a boss or vehicle can't be a player
    playerCheckbox.disabled = isBoss || isVehicle;
    bossCheckbox.disabled = isPlayer;
    vehicleCheckbox.disabled = isPlayer;

    quickInfoFields.hidden = isPlayer || isVehicle;
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

function createTag(text, className)
{
    const tag = document.createElement("span");
    tag.className = `creature-tag ${className}`;
    tag.textContent = text;
    return tag;
}

// A labelled number input for one stat (HP, SP, ...); onChange gets the parsed value (NaN when blank)
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

// Editable stat that can't go below 0; blank saves as null
function createNonNegativeField(labelText, values, index, className)
{
    const field = createStatField(labelText, values[index], value =>
    {
        if (value < 0)
        {
            value = 0;
            input.value = 0;
        }

        values[index] = isNaN(value) ? null : value;
    });
    field.classList.add(className);

    const input = field.querySelector("input");
    input.min = 0;
    return field;
}

function createSpFields(creature, index)
{
    if (creature.isVehicle)
    {
        return [createNonNegativeField("SP", creature.spBody, index, "stat-sp")];
    }

    return [
        createNonNegativeField("SP H", creature.spHead, index, "stat-sp"),
        createNonNegativeField("SP B", creature.spBody, index, "stat-sp")
    ];
}

function createHpField(creature, index, box)
{
    const isDown = () => creature.hp[index] !== null && creature.hp[index] <= 0;

    const field = createStatField(creature.isVehicle ? "SDP" : "HP", creature.hp[index], value =>
    {
        // Players can leave HP blank; everyone else treats a blank as 0
        creature.hp[index] = isNaN(value) ? (creature.isPlayer ? null : 0) : value;
        box.classList.toggle("down", isDown());
    });
    field.classList.add("stat-hp");

    box.classList.toggle("down", isDown());
    return field;
}

// Green TRUE / red FALSE switch for whether this individual can dodge bullets
function createDodgeToggle(creature, index)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dodge-toggle";
    button.title = "Can dodge bullets (click to change)";

    const update = () =>
    {
        const canDodge = creature.canDodge[index];
        button.classList.toggle("can-dodge", canDodge);
        button.textContent = canDodge ? "Dodge: TRUE" : "Dodge: FALSE";
        button.setAttribute("aria-pressed", canDodge);
    };

    button.addEventListener("click", () =>
    {
        creature.canDodge[index] = !creature.canDodge[index];
        update();
    });

    update();
    return button;
}

// Evasion and Combat base are for reference; MOVE can change mid-fight so it stays editable
function renderQuickInfo(creature)
{
    const info = document.createElement("div");
    info.className = "quick-info";

    const addStat = (labelText, value) =>
    {
        const stat = document.createElement("span");
        stat.className = "quick-info-stat";

        const label = document.createElement("span");
        label.className = "quick-info-label";
        label.textContent = labelText;

        const number = document.createElement("strong");
        number.textContent = value === null ? "—" : value;

        stat.append(label, number);
        info.appendChild(stat);
    };

    addStat("Evasion", creature.quickInfo.evasion);
    addStat("Combat", creature.quickInfo.combat);

    const move = document.createElement("label");
    move.className = "quick-info-stat";

    const moveLabel = document.createElement("span");
    moveLabel.className = "quick-info-label";
    moveLabel.textContent = "MOVE";

    const moveInput = document.createElement("input");
    moveInput.type = "number";
    moveInput.min = 0;
    moveInput.className = "quick-info-input";
    moveInput.placeholder = "—";
    moveInput.value = creature.quickInfo.move === null ? "" : creature.quickInfo.move;
    moveInput.addEventListener("input", () =>
    {
        const value = parseInt(moveInput.value);

        if (value < 0)
        {
            moveInput.value = 0;
        }

        creature.quickInfo.move = isNaN(value) ? null : Math.max(0, value);
    });

    move.append(moveLabel, moveInput);
    info.appendChild(move);
    return info;
}

// Damage goes through stopping power first: SP soaks that much, and only the rest hits HP/SDP.
// Headshots double whatever gets through the head SP.
// Anything that gets through ablates the SP it hit (by 1, or 2 with Armor Piercing); a hit that
// doesn't get through just plinks and leaves the armor alone. Rubber rounds never ablate and
// can't drop a target below 1 HP. Applies to the selected individuals, or the only one there is.
function applyDamage(creature, damage)
{
    const options = creature.damageOptions;
    const single = creature.hp.length === 1;
    const headshot = !creature.isVehicle && options.location === "head";
    const spValues = headshot ? creature.spHead : creature.spBody;
    const results = [];

    creature.hp.forEach((hp, index) =>
    {
        if (!single && !creature.selected[index])
        {
            return;
        }

        const sp = spValues[index] === null ? 0 : spValues[index];
        let through = damage - sp;

        if (through <= 0)
        {
            results.push({ plinked: true, sp: sp });
            return;
        }

        if (headshot)
        {
            through *= 2;
        }

        let newHp = hp - through;

        if (options.rubber)
        {
            newHp = Math.max(Math.min(hp, 1), newHp);
        }

        creature.hp[index] = Math.max(0, newHp);

        if (!options.rubber && spValues[index] !== null)
        {
            spValues[index] = Math.max(0, sp - (options.armorPiercing ? 2 : 1));
        }

        results.push({ plinked: false, taken: hp - creature.hp[index], sp: sp, newSp: spValues[index] });
    });

    if (single)
    {
        const result = results[0];
        const spText = result.newSp === undefined || result.newSp === null || result.newSp === result.sp
            ? ""
            : ` SP ${result.sp} → ${result.newSp}.`;

        creature.damageNote = result.plinked
            ? `Plink! ${damage} didn't get through SP ${result.sp}.`
            : `Took ${result.taken} damage${headshot ? " (headshot x2)" : ""}.${spText}`;
    }
    else
    {
        const plinked = results.filter(r => r.plinked).length;
        const hit = results.length - plinked;

        const headshotText = headshot && hit > 0 ? " (headshot x2)" : "";

        creature.damageNote = plinked > 0
            ? `${hit} took damage${headshotText}, ${plinked} plinked.`
            : `${hit} took damage${headshotText}.`;
    }

    creature.selected.fill(false);
    render();
}

function createDamageOption(labelText, checked, onChange)
{
    const option = document.createElement("label");
    option.className = "initiative-check damage-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;
    checkbox.addEventListener("change", () => onChange(checkbox.checked));

    option.append(checkbox, ` ${labelText}`);
    return option;
}

function renderDamageRow(creature)
{
    const options = creature.damageOptions;

    const row = document.createElement("div");
    row.className = "damage-row";

    const input = document.createElement("input");
    input.type = "number";
    input.min = 0;
    input.className = "damage-input";
    input.placeholder = "Damage";
    input.setAttribute("aria-label", `Damage to ${creature.name}`);

    row.appendChild(input);

    // Vehicles only have one SP, so there's no hit location to pick
    if (!creature.isVehicle)
    {
        const location = document.createElement("select");
        location.className = "damage-location";
        location.setAttribute("aria-label", "Hit location");

        for (const [value, text] of [["body", "Body"], ["head", "Head"]])
        {
            const choice = document.createElement("option");
            choice.value = value;
            choice.textContent = text;
            location.appendChild(choice);
        }

        location.value = options.location;
        location.addEventListener("change", () => options.location = location.value);
        row.appendChild(location);
    }

    // Armor Piercing and Rubber pull in opposite directions, so only one can be on
    const armorPiercing = createDamageOption("Armor Piercing", options.armorPiercing, checked =>
    {
        options.armorPiercing = checked;

        if (checked)
        {
            options.rubber = false;
            rubber.querySelector("input").checked = false;
        }
    });

    const rubber = createDamageOption("Rubber", options.rubber, checked =>
    {
        options.rubber = checked;

        if (checked)
        {
            options.armorPiercing = false;
            armorPiercing.querySelector("input").checked = false;
        }
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "damage-btn";
    button.textContent = creature.hp.length > 1 ? "Apply Damage to Selected" : "Apply Damage";

    // Shows the result of the last hit (plinks, damage taken, ablation) once, then clears it
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

    row.append(armorPiercing, rubber, button, hint);
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
        name.appendChild(createTag("PC", ""));
    }

    if (creature.isBoss)
    {
        name.appendChild(createTag("BOSS", "boss-tag"));
    }

    if (creature.isVehicle)
    {
        name.appendChild(createTag("VEHICLE", "vehicle-tag"));
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

    if (creature.quickInfo)
    {
        card.appendChild(renderQuickInfo(creature));
    }

    const hpList = document.createElement("div");
    hpList.className = "hp-list";

    creature.hp.forEach((hp, index) =>
    {
        const box = document.createElement("div");
        box.className = "hp-box";

        if (creature.hp.length > 1)
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

        box.append(createHpField(creature, index, box), ...createSpFields(creature, index));

        if (creature.canDodge)
        {
            box.appendChild(createDodgeToggle(creature, index));
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

        member.append(memberInitiative, memberName, createHpField(player, 0, member), ...createSpFields(player, 0));

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
