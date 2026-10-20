const searchInput = document.getElementById("searchInput");
const levelFilter = document.getElementById("levelFilter");
const schoolFilter = document.getElementById("schoolFilter");
const ritualFilter = document.getElementById("ritualFilter");
const concentrationFilter = document.getElementById("concentrationFilter");
const classFilter = document.getElementById("classFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const tableBody = document.getElementById("spellsTableBody");
const resultsCount = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const tableHeaders = document.querySelectorAll("#spellsTable th[data-sort]");

let spells = [];
let currentSort = {
  key: "name",
  asc: true
};

let spellNum = 0;

function levelLabel(level) {
  if (level === "Cantrip") return "Cantrip";
  if (level === "1") return "1st";
  if (level === "2") return "2nd";
  if (level === "3") return "3rd";
  return `${level}th`;
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function normalize(text) {
  return String(text).toLowerCase().trim();
}

function renderTableRows(spellList) {
  tableBody.innerHTML = "";

  if (spellList.length === 0) {
    noResults.hidden = false;
    resultsCount.textContent = "Showing 0 spells";
    return;
  }

  noResults.hidden = true;
  resultsCount.textContent = `Showing ${spellList.length} spell${spellList.length === 1 ? "" : "s"}`;

  for (const spell of spellList) {
    const row = document.createElement("tr");
    const schools = [spell.school].flat().join(", ");

    row.innerHTML = `
      <td><a href="${spell.url}">${spell.name}</a></td>
      <td>${levelLabel(spell.level)}</td>
      <td>${schools}</td>
      <td>${spell.castingTime}</td>
      <td>${spell.range}</td>
      <td>${spell.duration}</td>
      <td>${yesNo(spell.ritual)}</td>
      <td>${yesNo(spell.concentration)}</td>
      <td>${spell.classes.join(", ")}</td>
    `;

    tableBody.appendChild(row);
  }
}

function getFilteredSpells() {
  const search = normalize(searchInput.value);
  const selectedLevel = levelFilter.value;
  const selectedSchool = schoolFilter.value;
  const selectedRitual = ritualFilter.value;
  const selectedConcentration = concentrationFilter.value;
  const selectedClass = classFilter.value;

  return spells.filter(spell => {
    const matchesSearch =
      !search ||
      normalize(spell.name).includes(search);

    const matchesLevel =
      !selectedLevel ||
      spell.level === selectedLevel;

    // Changing the system to allow for multiple schools in the spell entry in
    // the JSON file.
    const schools = [spell.school].flat();
    const matchesSchool = !selectedSchool || schools.includes(selectedSchool);

    const matchesRitual =
      !selectedRitual ||
      String(spell.ritual) === selectedRitual;

    const matchesConcentration =
      !selectedConcentration ||
      String(spell.concentration) === selectedConcentration;

    const matchesClass =
      !selectedClass ||
      spell.classes.includes(selectedClass);

    return (
      matchesSearch &&
      matchesLevel &&
      matchesSchool &&
      matchesRitual &&
      matchesConcentration &&
      matchesClass
    );
  });
}

function levelRank(level) {
  if (level === "Cantrip") return 0;
  return parseInt(level, 10);
}

function sortSpells(spellList) {
  return [...spellList].sort((a, b) => {

    // Primary sort: level
    const levelDiff = levelRank(a.level) - levelRank(b.level);
    if (levelDiff !== 0) return levelDiff;

    // Secondary sort: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

function updateTable() {
  const filtered = getFilteredSpells();
  const sorted = sortSpells(filtered);
  renderTableRows(sorted);
}

function clearFilters() {
  searchInput.value = "";
  levelFilter.value = "";
  schoolFilter.value = "";
  ritualFilter.value = "";
  concentrationFilter.value = "";
  classFilter.value = "";
  updateTable();
}

async function loadSpells() {
  try {
    const response = await fetch("Data/Spells.json");

    if (!response.ok) {
      throw new Error(`Failed to load spells.json (${response.status})`);
    }

    spells = await response.json();
    updateTable();
    spellNum = spells.length;
  } catch (error) {
    console.error(error);
    resultsCount.textContent = "Failed to load spells.";
    noResults.hidden = false;
    noResults.textContent = "There was a problem loading the spell list.";
  }
}

searchInput.addEventListener("input", updateTable);
levelFilter.addEventListener("change", updateTable);
schoolFilter.addEventListener("change", updateTable);
ritualFilter.addEventListener("change", updateTable);
concentrationFilter.addEventListener("change", updateTable);
classFilter.addEventListener("change", updateTable);
clearFiltersBtn.addEventListener("click", clearFilters);

for (const header of tableHeaders) {
  header.addEventListener("click", () => {
    const key = header.dataset.sort;

    if (currentSort.key === key) {
      currentSort.asc = !currentSort.asc;
    } else {
      currentSort.key = key;
      currentSort.asc = true;
    }

    updateTable();
  });
}

loadSpells();