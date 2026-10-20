const spellName = document.getElementById("spellName");
const spellSubtitle = document.getElementById("spellSubtitle");
const castingTime = document.getElementById("castingTime");
const spellRange = document.getElementById("spellRange");
const components = document.getElementById("components");
const duration = document.getElementById("duration");
const spellDescription = document.getElementById("spellDescription");
const higherLevels = document.getElementById("higherLevels");
const spellLists = document.getElementById("spellLists");

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

function formatText(value) {
  return String(value)
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
  if (level === 1) return "1st";
  if (level === 2) return "2nd";
  if (level === 3) return "3rd";
  return `${level}th`;
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

function renderEntries(container, entries) {
  container.innerHTML = "";
  for (const entry of entries || []) {
    const paragraph = document.createElement("p");
    paragraph.textContent = entryText(entry);
    container.appendChild(paragraph);
  }
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
  return datasets.flatMap(dataset => dataset.spell);
}

async function displaySpell() {
  const requestedName = new URLSearchParams(window.location.search).get("name");
  if (!requestedName) throw new Error("No spell name was provided.");

  const spell = (await loadSpellData()).find(
    entry => entry.name.toLowerCase() === requestedName.toLowerCase()
  );
  if (!spell) throw new Error(`Spell not found: ${requestedName}`);

  const school = schoolNames[spell.school] || spell.school;
  const classes = (spell.classes?.fromClassList || []).map(entry => entry.name);
  const title = `${spell.name} - Homebrew Hub`;

  document.title = title;
  document.querySelector('meta[name="description"]').content = `${spell.name} spell details.`;
  spellName.textContent = spell.name;
  spellSubtitle.textContent = `${levelLabel(spell.level)} Level ${school}`;
  castingTime.textContent = formatTime(spell.time);
  spellRange.textContent = formatRange(spell.range);
  components.textContent = formatComponents(spell.components);
  duration.textContent = formatDuration(spell.duration);
  spellLists.textContent = classes.join(", ");
  renderEntries(spellDescription, spell.entries);
  renderEntries(
    higherLevels,
    spell.entriesHigherLevel ? [{ entries: spell.entriesHigherLevel }] : []
  );
}

displaySpell().catch(error => {
  console.error(error);
  spellName.textContent = "Spell unavailable";
  spellDescription.textContent = "There was a problem loading this spell.";
});
