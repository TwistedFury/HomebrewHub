"use strict";

const combatants = [];
let nextId = 1;
let currentId = null;
let round = 1;
let roundOrder = [];
const delayedThisRound = new Set();

const form = document.getElementById("combatantForm");
const nameInput = document.getElementById("combatantName");
const dexInput = document.getElementById("combatantDex");
const maxHpInput = document.getElementById("combatantMaxHp");
const hpInput = document.getElementById("combatantHp");
const majorWoundInput = document.getElementById("combatantMajorWound");
const combatButton = document.getElementById("combatButton");
const nextTurnButton = document.getElementById("nextTurnButton");
const roundDisplay = document.getElementById("roundDisplay");
const combatantStatus = document.getElementById("combatantStatus");
const initiativeList = document.getElementById("initiativeList");

const conResultLabels = {
  failure: "Failure",
  success: "Success",
  hard: "Hard success",
  critical: "Critical success"
};

function isDying(combatant) {
  return !combatant.dead && combatant.hp === 0 && combatant.majorWound;
}

function isUnconscious(combatant) {
  return !combatant.dead && (combatant.unconscious || (combatant.hp === 0 && !combatant.majorWound));
}

function sortCombatants() {
  combatants.sort((a, b) => b.dex - a.dex || a.id - b.id);
}

function renderCombatBar() {
  const inCombat = currentId !== null;

  combatButton.textContent = inCombat ? "End Combat" : "Start Combat";
  combatButton.classList.toggle("initiative-btn-secondary", inCombat);
  combatButton.disabled = !inCombat && (
    combatants.length === 0 ||
    combatants.every(combatant => combatant.dead)
  );
  nextTurnButton.hidden = !inCombat;

  if (inCombat) {
    const current = combatants.find(combatant => combatant.id === currentId);
    roundDisplay.textContent = `Round ${round}${current ? ` · ${current.name}'s turn` : ""}`;
  } else {
    roundDisplay.textContent = "Not in combat";
  }
  roundDisplay.classList.toggle("active", inCombat);
}

function makeButton(text, className, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function renderCombatant(combatant) {
  const card = document.createElement("article");
  card.className = "creature coc-combatant";
  card.classList.toggle("current-turn", combatant.id === currentId);
  card.classList.toggle("coc-dead", combatant.dead);

  const header = document.createElement("div");
  header.className = "creature-header";
  const title = document.createElement("h2");
  title.className = "creature-name";
  title.textContent = combatant.name;

  const dexField = document.createElement("label");
  dexField.className = "stat-field coc-dex-field";
  const dexLabel = document.createElement("span");
  dexLabel.className = "stat-label";
  dexLabel.textContent = "DEX / INIT";
  const dexValue = document.createElement("input");
  dexValue.type = "number";
  dexValue.min = "1";
  dexValue.max = "100";
  dexValue.step = "any";
  dexValue.value = String(combatant.dex);
  dexValue.setAttribute("aria-label", `DEX / initiative for ${combatant.name}`);
  dexValue.addEventListener("change", () => {
    const value = Number(dexValue.value);
    if (Number.isFinite(value) && value >= 1 && value <= 100) {
      combatant.dex = value;
      render();
    } else {
      dexValue.value = String(combatant.dex);
    }
  });
  dexField.append(dexLabel, dexValue);
  header.append(title, dexField);

  header.appendChild(makeButton("Remove", "creature-remove", `Remove ${combatant.name}`, () => removeCombatant(combatant.id)));
  card.appendChild(header);

  const health = document.createElement("div");
  health.className = "coc-health-row";
  const hpLabel = document.createElement("label");
  hpLabel.className = "stat-field";
  const hpTitle = document.createElement("span");
  hpTitle.className = "stat-label";
  hpTitle.textContent = "Current HP";
  const hpValue = document.createElement("input");
  hpValue.type = "number";
  hpValue.min = "0";
  hpValue.max = String(combatant.maxHp);
  hpValue.value = String(combatant.hp);
  hpValue.setAttribute("aria-label", `Current HP for ${combatant.name}`);
  hpValue.addEventListener("change", () => {
    const value = Number(hpValue.value);
    if (Number.isInteger(value) && value >= 0 && value <= combatant.maxHp) {
      const wasDying = isDying(combatant);
      combatant.hp = value;
      if (value > 0) combatant.unconscious = false;
      if (isDying(combatant) && !wasDying) {
        combatant.dyingSinceRound = currentId === null ? 0 : round;
      } else if (!isDying(combatant)) {
        combatant.dyingSinceRound = null;
      }
      render();
    } else {
      hpValue.value = String(combatant.hp);
    }
  });
  hpLabel.append(hpTitle, hpValue);
  const maxHp = document.createElement("span");
  maxHp.className = "coc-max-hp";
  maxHp.textContent = `/ ${combatant.maxHp} max HP`;
  health.append(hpLabel, maxHp);

  const woundLabel = document.createElement("label");
  woundLabel.className = "initiative-check coc-wound-toggle";
  const woundToggle = document.createElement("input");
  woundToggle.type = "checkbox";
  woundToggle.checked = combatant.majorWound;
  woundToggle.setAttribute("aria-label", `Major wound for ${combatant.name}`);
  woundToggle.addEventListener("change", () => {
    const wasDying = isDying(combatant);
    combatant.majorWound = woundToggle.checked;
    if (!combatant.majorWound) combatant.pendingMajorConCheck = false;
    if (isDying(combatant) && !wasDying) {
      combatant.dyingSinceRound = currentId === null ? 0 : round;
    } else if (!isDying(combatant)) {
      combatant.dyingSinceRound = null;
    }
    render();
  });
  woundLabel.append(woundToggle, document.createTextNode("Major wound"));
  health.appendChild(woundLabel);
  card.appendChild(health);

  const status = document.createElement("p");
  status.className = "coc-condition";
  const dyingCheckDue = isDying(combatant) && canRollDyingCheck(combatant);
  if (combatant.dead) {
    status.textContent = combatant.lastConCheck?.kind === "dying"
      && combatant.lastConCheck.result === "failure"
      ? "Dead: a dying CON check failed."
      : "Dead: a single attack dealt more than maximum HP.";
  } else if (isDying(combatant)) {
    status.textContent = dyingCheckDue
      ? "Dying: unconscious; make the required CON check for this round."
      : "Dying: unconscious; a CON check is required at the end of a later round.";
  } else if (combatant.unconscious) {
    status.textContent = "Unconscious: failed the major wound CON check.";
  } else if (isUnconscious(combatant)) {
    status.textContent = "Unconscious: at 0 HP without a major wound.";
  } else if (combatant.majorWound) {
    status.textContent = combatant.pendingMajorConCheck
      ? "Major wound: prone; make a CON check to remain conscious."
      : "Major wound: prone.";
  } else {
    status.textContent = "No major wound.";
  }
  card.appendChild(status);

  if (dyingCheckDue || (!isDying(combatant) && !combatant.dead && combatant.pendingMajorConCheck)) {
    const kind = isDying(combatant) ? "dying" : "major-wound";
    card.appendChild(renderConResultEditor(combatant, kind));
  }
  if (combatant.lastConCheck) {
    const result = document.createElement("p");
    result.className = "coc-roll-status";
    result.textContent = `Last ${combatant.lastConCheck.kind === "dying" ? "dying" : "major wound"} CON check: ${conResultLabels[combatant.lastConCheck.result]}`;
    card.appendChild(result);
  }
  if (combatant.id === currentId && canDelayCurrent()) {
    card.appendChild(makeButton("Delay Turn", "initiative-btn coc-delay-button",
      `Delay ${combatant.name}'s turn`, delayCurrentTurn));
  }
  const damageRow = document.createElement("div");
  damageRow.className = "damage-row coc-damage-row";
  const damageInput = document.createElement("input");
  damageInput.type = "number";
  damageInput.min = "1";
  damageInput.step = "1";
  damageInput.className = "damage-input";
  damageInput.placeholder = "Damage";
  damageInput.setAttribute("aria-label", `Damage from one attack to ${combatant.name}`);
  const applyButton = makeButton("Apply Damage", "damage-btn", `Apply damage to ${combatant.name}`, () => {
    const damage = Number(damageInput.value);
    if (!Number.isInteger(damage) || damage <= 0 || combatant.dead) {
      damageInput.focus();
      return;
    }
    applyDamage(combatant, damage);
  });
  applyButton.disabled = combatant.dead;
  damageRow.append(damageInput, applyButton);
  card.appendChild(damageRow);

  return card;
}

function renderConResultEditor(combatant, kind) {
  const editor = document.createElement("div");
  editor.className = "coc-con-result";

  const label = document.createElement("label");
  label.htmlFor = `con-result-${kind}-${combatant.id}`;
  label.textContent = kind === "dying"
    ? "Keeper-recorded CON result for this round"
    : "Keeper-recorded major wound CON result";

  const controls = document.createElement("div");
  controls.className = "coc-con-result-controls";
  const select = document.createElement("select");
  select.id = label.htmlFor;
  select.setAttribute("aria-label", `${kind === "dying" ? "Dying" : "Major wound"} CON result for ${combatant.name}`);
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select the rolled result";
  select.appendChild(placeholder);

  for (const [value, text] of Object.entries(conResultLabels)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }
  select.value = combatant.pendingConResult || "";

  const button = makeButton("Record CON Result", "initiative-btn coc-con-button",
    `Record CON result for ${combatant.name}`, () => {
      if (!select.value) {
        combatantStatus.textContent = "Select the result the player rolled before recording the CON check.";
        select.focus();
        return;
      }
      recordConResult(combatant, kind, select.value);
    });

  select.addEventListener("change", () => {
    combatant.pendingConResult = select.value;
  });
  controls.append(select, button);
  editor.append(label, controls);
  return editor;
}

function render() {
  sortCombatants();
  renderCombatBar();
  initiativeList.replaceChildren();

  if (combatants.length === 0) {
    const empty = document.createElement("p");
    empty.className = "initiative-empty";
    empty.textContent = "Add combatants to create an encounter.";
    initiativeList.appendChild(empty);
    return;
  }

  for (const combatant of combatants) {
    initiativeList.appendChild(renderCombatant(combatant));
  }
}

function applyDamage(combatant, damage) {
  const wasDying = isDying(combatant);
  if (damage > combatant.maxHp) {
    combatant.dead = true;
    combatant.hp = 0;
  } else {
    if (damage * 2 >= combatant.maxHp) {
      combatant.majorWound = true;
      combatant.pendingMajorConCheck = true;
    }
    combatant.hp = Math.max(0, combatant.hp - damage);
  }
  if (isDying(combatant)) combatant.pendingMajorConCheck = false;
  if (isDying(combatant) && !wasDying) {
    combatant.dyingSinceRound = currentId === null ? 0 : round;
  } else if (!isDying(combatant)) {
    combatant.dyingSinceRound = null;
  }
  if (combatant.dead && combatant.id === currentId) {
    advancePastCurrent();
  } else if (combatant.dead) {
    roundOrder = roundOrder.filter(id => id !== combatant.id);
    delayedThisRound.delete(combatant.id);
  }
  combatant.lastConCheck = null;
  render();
}

function recordConResult(combatant, kind, result) {
  if (!Object.prototype.hasOwnProperty.call(conResultLabels, result)) return;
  const isDyingCheck = kind === "dying" && isDying(combatant) && canRollDyingCheck(combatant);
  const isMajorWoundCheck = kind === "major-wound"
    && !isDying(combatant)
    && !combatant.dead
    && combatant.pendingMajorConCheck;
  if (!isDyingCheck && !isMajorWoundCheck) return;

  const passed = result !== "failure";
  combatant.pendingConResult = "";
  if (isDyingCheck) {
    combatant.lastConCheck = { result, kind, round };
    combatant.lastDyingCheckRound = round;
    if (!passed) combatant.dead = true;
    combatantStatus.textContent = `${combatant.name}: Keeper recorded ${conResultLabels[result]} on the dying CON check${passed ? "." : "; the investigator dies."}`;
    if (combatant.dead && combatant.id === currentId) {
      advancePastCurrent();
    } else if (combatant.dead) {
      roundOrder = roundOrder.filter(id => id !== combatant.id);
      delayedThisRound.delete(combatant.id);
    }
  } else {
    if (kind !== "major-wound" || !combatant.pendingMajorConCheck) return;
    combatant.lastConCheck = { result, kind };
    combatant.pendingMajorConCheck = false;
    combatant.unconscious = !passed;
    combatantStatus.textContent = `${combatant.name}: Keeper recorded ${conResultLabels[result]} on the major wound CON check${passed ? "; remains conscious." : "; falls unconscious."}`;
  }
  render();
}

function canRollDyingCheck(combatant) {
  if (round <= (combatant.dyingSinceRound ?? 0) || combatant.lastDyingCheckRound === round) return false;
  if (currentId === null) return true;
  const active = roundOrder.filter(id => {
    const current = combatants.find(entry => entry.id === id);
    return current && !current.dead;
  });
  return active[active.length - 1] === currentId;
}

function canDelayCurrent() {
  const index = roundOrder.indexOf(currentId);
  return index >= 0
    && !delayedThisRound.has(currentId)
    && roundOrder.slice(index + 1).some(id => {
      const combatant = combatants.find(entry => entry.id === id);
      return combatant && !combatant.dead;
    });
}

function delayCurrentTurn() {
  if (!canDelayCurrent()) return;
  const index = roundOrder.indexOf(currentId);
  const [delayedId] = roundOrder.splice(index, 1);
  roundOrder.push(delayedId);
  delayedThisRound.add(delayedId);
  currentId = roundOrder[index] ?? roundOrder[0] ?? null;
  render();
}

function advancePastCurrent() {
  const index = roundOrder.indexOf(currentId);
  roundOrder = roundOrder.filter(id => id !== currentId);
  delayedThisRound.delete(currentId);
  const active = roundOrder.filter(id => {
    const combatant = combatants.find(entry => entry.id === id);
    return combatant && !combatant.dead;
  });
  if (active.length === 0) {
    currentId = null;
    round = 1;
    roundOrder = [];
    return;
  }
  if (index >= active.length) {
    round++;
    roundOrder = combatants.filter(combatant => !combatant.dead).map(combatant => combatant.id);
    delayedThisRound.clear();
    currentId = roundOrder[0];
  } else {
    currentId = active[index] ?? active[0];
  }
}

function startCombat() {
  if (combatants.length === 0 || combatants.every(combatant => combatant.dead)) return;
  currentId = combatants.find(combatant => !combatant.dead)?.id ?? null;
  round = 1;
  roundOrder = combatants.filter(combatant => !combatant.dead).map(combatant => combatant.id);
  delayedThisRound.clear();
  render();
}

function nextTurn() {
  const active = roundOrder.filter(id => {
    const combatant = combatants.find(entry => entry.id === id);
    return combatant && !combatant.dead;
  });
  if (active.length === 0) {
    currentId = null;
    round = 1;
    roundOrder = [];
    render();
    return;
  }
  const currentIndex = active.indexOf(currentId);
  if (currentIndex === active.length - 1) round++;
  if (currentIndex === active.length - 1) {
    roundOrder = combatants.filter(combatant => !combatant.dead).map(combatant => combatant.id);
    delayedThisRound.clear();
    currentId = roundOrder[0] ?? null;
  } else {
    currentId = active[currentIndex + 1] ?? active[0] ?? null;
  }
  render();
}

function removeCombatant(id) {
  const index = combatants.findIndex(combatant => combatant.id === id);
  if (index < 0) return;
  if (currentId === id) {
    const turnIndex = roundOrder.indexOf(id);
    roundOrder = roundOrder.filter(turnId => turnId !== id);
    delayedThisRound.delete(id);
    const active = roundOrder.filter(turnId => {
      const combatant = combatants.find(entry => entry.id === turnId);
      return combatant && !combatant.dead;
    });
    if (active.length === 0) {
      currentId = null;
      round = 1;
      roundOrder = [];
    } else {
      const nextId = roundOrder.slice(Math.min(turnIndex, roundOrder.length))
        .find(turnId => active.includes(turnId));
      if (nextId) {
        currentId = nextId;
      } else {
        currentId = null;
        round++;
        roundOrder = combatants.filter(combatant => combatant.id !== id && !combatant.dead)
          .map(combatant => combatant.id);
        delayedThisRound.clear();
        currentId = roundOrder[0] ?? null;
      }
    }
  } else {
    roundOrder = roundOrder.filter(turnId => turnId !== id);
    delayedThisRound.delete(id);
  }
  combatants.splice(index, 1);
  render();
}

function scheduleLateCombatant(combatant) {
  const currentIndex = roundOrder.indexOf(currentId);
  if (currentIndex < 0) {
    roundOrder.push(combatant.id);
    return;
  }

  const currentAndActed = roundOrder.slice(0, currentIndex + 1);
  const future = roundOrder.slice(currentIndex + 1);
  const delayedFuture = future.filter(id => delayedThisRound.has(id));
  const pendingFuture = future.filter(id => !delayedThisRound.has(id));
  const sortedPosition = new Map(combatants.map((entry, index) => [entry.id, index]));
  const nextTurns = [...pendingFuture, combatant.id]
    .sort((a, b) => sortedPosition.get(a) - sortedPosition.get(b));
  roundOrder = [...currentAndActed, ...nextTurns, ...delayedFuture];
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const combatant = {
    id: nextId++,
    name: nameInput.value.trim(),
    dex: Number(dexInput.value),
    maxHp: Number(maxHpInput.value),
    hp: Number(hpInput.value),
    majorWound: majorWoundInput.checked,
    pendingMajorConCheck: false,
    pendingConResult: "",
    unconscious: false,
    dead: false,
    lastConCheck: null,
    dyingSinceRound: null,
    lastDyingCheckRound: null
  };
  if (!combatant.name || !Number.isFinite(combatant.dex) || combatant.dex < 1 || combatant.dex > 100
      || !Number.isInteger(combatant.maxHp) || combatant.maxHp < 1
      || !Number.isInteger(combatant.hp) || combatant.hp < 0 || combatant.hp > combatant.maxHp) {
    combatantStatus.textContent = "Enter a name, a DEX / initiative value from 1 to 100, and valid hit points.";
    return;
  }

  if (isDying(combatant)) combatant.dyingSinceRound = currentId === null ? 0 : round;
  combatants.push(combatant);
  if (currentId !== null && !combatant.dead) {
    sortCombatants();
    scheduleLateCombatant(combatant);
  }
  combatantStatus.textContent = "";
  form.reset();
  dexInput.value = "50";
  maxHpInput.value = "10";
  hpInput.value = "10";
  hpInput.max = "10";
  nameInput.focus();
  render();
});

combatButton.addEventListener("click", () => {
  if (currentId === null) {
    startCombat();
  } else {
    currentId = null;
    round = 1;
    roundOrder = [];
    delayedThisRound.clear();
    render();
  }
});
nextTurnButton.addEventListener("click", nextTurn);
document.getElementById("clearButton").addEventListener("click", () => {
  combatants.length = 0;
  currentId = null;
  round = 1;
  roundOrder = [];
  delayedThisRound.clear();
  combatantStatus.textContent = "";
  render();
});

maxHpInput.addEventListener("input", () => {
  hpInput.max = maxHpInput.value;
  if (Number(hpInput.value) > Number(maxHpInput.value)) {
    hpInput.value = maxHpInput.value;
  }
});

render();
