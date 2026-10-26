const MAX_SELECTED_SPELLS = 8;
const MAX_SEARCH_RESULTS = 20;
const COLLAPSE_THRESHOLD = 500;
const searchInput = document.getElementById("spellSearch");
const searchStatus = document.getElementById("searchStatus");
const searchResults = document.getElementById("spellSearchResults");
const selectedSpellsContainer = document.getElementById("selectedSpells");
const selectionStatus = document.getElementById("selectionStatus");
const emptySelection = document.getElementById("emptySelection");

const schoolNames = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  I: "Illusion",
  N: "Necromancy",
  T: "Transmutation",
  V: "Evocation"
};

let spells = [];
let selectedSpells = [];
let spellBodyId = 0;

function formatText(value) {
  const text = value && typeof value === "object" && typeof value.text === "string"
    ? value.text
    : value;
  return String(text)
    .replace(/\{@(?:dice|damage|hit|chance) ([^}]+)\}/g, "$1")
    .replace(/\{@[^ ]+ ([^}]+)\}/g, "$1");
}

function formatTime(time) {
  const value = time?.[0];
  return value ? `${value.number} ${value.unit}` : "";
}

function formatRange(range) {
  const distance = range?.distance;
  if (!distance) return range?.type || "";
  return distance.amount ? `${distance.amount} ${distance.type}` : distance.type;
}

function formatDuration(duration) {
  const value = duration?.[0];
  if (!value) return "";
  if (value.type === "instant") return "Instantaneous";
  if (value.type === "permanent") return "Permanent";

  const length = value.duration;
  return length ? `${length.amount} ${length.type}` : value.type;
}

function levelLabel(level) {
  if (level === 0) return "Cantrip";
  const ordinal = level % 100 >= 11 && level % 100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[level % 10] || "th");
  return `${level}${ordinal} Level`;
}

function formatComponents(value) {
  if (!value) return "";
  const names = [];
  if (value.v) names.push("V");
  if (value.s) names.push("S");
  if (value.m) names.push(`M (${formatText(value.m)})`);
  return names.join(", ");
}

function entryText(entry) {
  if (typeof entry === "string") return formatText(entry);
  return (entry.entries || []).map(entryText).join(" ");
}

function appendEntries(container, entries) {
  for (const entry of entries || []) {
    const paragraph = document.createElement("p");
    paragraph.textContent = entryText(entry);
    container.appendChild(paragraph);
  }
}

function spellKey(spell) {
  return `${spell.name.toLocaleLowerCase()}|${spell.source || ""}`;
}

function renderSearchResults() {
  searchResults.replaceChildren();
  const query = searchInput.value.trim().toLocaleLowerCase();

  if (!query) {
    searchStatus.textContent = "Enter a spell name to search all loaded spell sources.";
    return;
  }

  const matches = spells
    .filter(spell => spell.name.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (matches.length === 0) {
    searchStatus.textContent = "No spells matched your search.";
    return;
  }

  const displayedMatches = matches.slice(0, MAX_SEARCH_RESULTS);
  searchStatus.textContent = matches.length > MAX_SEARCH_RESULTS
    ? `Showing the first ${MAX_SEARCH_RESULTS} of ${matches.length} matching spells.`
    : `${matches.length} spell${matches.length === 1 ? "" : "s"} found.`;

  for (const spell of displayedMatches) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const name = document.createElement("span");
    const detail = document.createElement("span");
    const alreadySelected = selectedSpells.some(
      selected => spellKey(selected) === spellKey(spell)
    );
    const atLimit = selectedSpells.length >= MAX_SELECTED_SPELLS;

    button.type = "button";
    button.className = "spell-search-result";
    button.disabled = alreadySelected || atLimit;
    name.className = "spell-search-result-name";
    name.textContent = spell.name;
    detail.className = "spell-search-result-detail";
    detail.textContent = `${levelLabel(spell.level)} · ${schoolNames[spell.school] || spell.school} · ${spell.source || "Unknown source"}`;
    button.append(name, detail);
    button.setAttribute(
      "aria-label",
      `${alreadySelected ? "Already added" : atLimit ? "Eight-spell limit reached" : "Add"}: ${spell.name}`
    );
    button.addEventListener("click", () => addSpell(spell));
    item.appendChild(button);
    searchResults.appendChild(item);
  }
}

function createDetail(label, value) {
  if (!value) return null;

  const paragraph = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  paragraph.append(strong, document.createTextNode(value));
  return paragraph;
}

function renderSpellCard(spell) {
  const card = document.createElement("article");
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  const removeButton = document.createElement("button");
  const subtitle = document.createElement("p");
  const meta = document.createElement("section");
  const body = document.createElement("section");
  const footer = document.createElement("footer");
  const classes = (spell.classes?.fromClassList || [])
    .map(entry => entry.name)
    .join(", ");

  card.className = "spell-entry";
  heading.className = "spell-card-heading";
  title.textContent = spell.name;
  removeButton.type = "button";
  removeButton.className = "spell-remove-button";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", `Remove ${spell.name}`);
  removeButton.addEventListener("click", () => removeSpell(spell));
  heading.append(title, removeButton);

  subtitle.className = "spell-subtitle";
  subtitle.textContent = [
    `${levelLabel(spell.level)}${spell.level === 0 ? "" : ` ${schoolNames[spell.school] || spell.school}`}`,
    spell.source
  ].filter(Boolean).join(" · ");

  meta.className = "spell-meta";
  for (const [label, value] of [
    ["Casting Time", formatTime(spell.time)],
    ["Range", formatRange(spell.range)],
    ["Components", formatComponents(spell.components)],
    ["Duration", formatDuration(spell.duration)]
  ]) {
    const detail = createDetail(label, value);
    if (detail) meta.appendChild(detail);
  }

  body.className = "spell-body";
  appendEntries(body, spell.entries);
  if (spell.entriesHigherLevel?.length) {
    const higherLevels = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = "At Higher Levels: ";
    higherLevels.append(label, document.createTextNode(
      spell.entriesHigherLevel.map(entryText).join(" ")
    ));
    body.appendChild(higherLevels);
  }

  const expandButton = document.createElement("button");
  const isLongSpell = body.textContent.trim().length > COLLAPSE_THRESHOLD;
  if (isLongSpell) {
    body.id = `spell-body-${spellBodyId++}`;
    body.classList.add("spell-body-collapsed");
    expandButton.type = "button";
    expandButton.className = "spell-expand-button";
    expandButton.textContent = "Show more";
    expandButton.setAttribute("aria-expanded", "false");
    expandButton.setAttribute("aria-controls", body.id);
    expandButton.addEventListener("click", () => {
      const isCollapsed = body.classList.toggle("spell-body-collapsed");
      expandButton.textContent = isCollapsed ? "Show more" : "Show less";
      expandButton.setAttribute("aria-expanded", String(!isCollapsed));
    });
  }

  footer.className = "spell-footer";
  footer.textContent = `Spell Lists: ${classes || "No class list"}${spell.source ? ` · Source: ${spell.source}` : ""}`;
  card.append(heading, subtitle, meta, body);
  if (isLongSpell) card.appendChild(expandButton);
  card.appendChild(footer);
  return card;
}

function renderSelectedSpells() {
  selectedSpellsContainer.replaceChildren(
    ...selectedSpells.map(renderSpellCard)
  );
  emptySelection.hidden = selectedSpells.length > 0;
  selectionStatus.textContent = `${selectedSpells.length} of ${MAX_SELECTED_SPELLS} spells selected`;
  renderSearchResults();
}

function addSpell(spell) {
  if (selectedSpells.length >= MAX_SELECTED_SPELLS) return;
  if (selectedSpells.some(selected => spellKey(selected) === spellKey(spell))) return;

  selectedSpells = [...selectedSpells, spell];
  renderSelectedSpells();
}

function removeSpell(spell) {
  selectedSpells = selectedSpells.filter(
    selected => spellKey(selected) !== spellKey(spell)
  );
  renderSelectedSpells();
}

async function loadSpellData() {
  const files = ["spells-phb.json", "spells-scag.json", "spells-xge.json"];
  const responses = await Promise.all(
    files.map(file => fetch(`../Data/${file}`))
  );

  for (const response of responses) {
    if (!response.ok) {
      throw new Error(`Failed to load spell data (${response.status})`);
    }
  }

  const datasets = await Promise.all(responses.map(response => response.json()));
  return datasets.flatMap(dataset => {
    if (!Array.isArray(dataset.spell)) {
      throw new Error("Invalid spell data: expected a spell list.");
    }
    return dataset.spell;
  });
}

async function initializeSpellDisplay() {
  try {
    spells = await loadSpellData();

    const requestedNames = new URLSearchParams(window.location.search).getAll("name");
    const missingNames = [];
    const notices = [];
    for (const requestedName of requestedNames.slice(0, MAX_SELECTED_SPELLS)) {
      const spell = spells.find(
        entry => entry.name.toLocaleLowerCase() === requestedName.toLocaleLowerCase()
      );
      if (spell && !selectedSpells.some(selected => spellKey(selected) === spellKey(spell))) {
        selectedSpells.push(spell);
      } else if (!spell) {
        missingNames.push(requestedName);
      }
    }

    if (requestedNames.length > MAX_SELECTED_SPELLS) {
      notices.push("Only the first eight spells in this link were loaded.");
    }
    if (missingNames.length) {
      notices.push(`Spell${missingNames.length === 1 ? "" : "s"} not found: ${missingNames.join(", ")}`);
    }

    renderSelectedSpells();
    if (notices.length) {
      searchStatus.textContent = notices.join(" ");
    }
  } catch (error) {
    console.error(error);
    searchStatus.textContent = "The spell library could not be loaded. Please try again later.";
    searchResults.replaceChildren();
  }
}

searchInput.addEventListener("input", renderSearchResults);
initializeSpellDisplay();
