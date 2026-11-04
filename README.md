<div align="center">

# 🎲 Homebrew Hub

**A browser-based toolkit for tabletop RPG sessions.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 📖 Project Description

Homebrew Hub is a browser-based tabletop RPG toolkit for organizing campaign
information, player characters, spell references, and combat encounters. The
front end uses HTML, CSS, and JavaScript, while the included Python server
provides API endpoints for saving campaign and player data to JSON files.

## ✨ Features

- 🗺️ **Campaigns:** browse campaigns, create campaigns, and add or remove saved
  players from a campaign
- 🧙 **Players:** create, view, clone, and edit player characters with class,
  level, hit points, armor class, and six attributes
- ⚔️ **D&D Combat:** track initiative, HP, AC, creature types and sizes,
  player-controlled creatures, bosses, legendary actions and resistances,
  vehicles, lairs, and imported campaign parties
- 🌃 **Cyberpunk RED Combat:** track initiative, HP or vehicle SDP, head and
  body SP, player groups, bosses, vehicles, enemy quick-reference stats,
  damage, and armor ablation
- 🕯️ **Call of Cthulhu Combat:** track DEX order, rounds, turns, HP, major
  wounds, unconscious or dying states, CON checks, damage, and delayed turns
- 📖 **Spell Library:** search and filter spells from PHB, SCAG, and XGE data
  by name, level, source, school, ritual, concentration, or class
- 🔍 **Multi-spell Display:** search the spell library and compare up to eight
  spell entries at once

## 📁 Pages

| Page | Current status |
| --- | --- |
| [`index.html`](./index.html) | Redirects to the current landing page |
| [`homePage.html`](./homePage.html) | Dashboard with links to all tools |
| [`Pages/Campaigns.html`](./Pages/Campaigns.html) | Campaign list, creation, and player assignment |
| [`Pages/Players.html`](./Pages/Players.html) | Player creation, cloning, editing, and saved-player list |
| [`Pages/InitiativeTrackers.html`](./Pages/InitiativeTrackers.html) | Initiative tracker selector |
| [`Pages/DnDInitiative.html`](./Pages/DnDInitiative.html) | Dungeons & Dragons combat tracker |
| [`Pages/CyberpunkInitiative.html`](./Pages/CyberpunkInitiative.html) | Cyberpunk RED combat tracker |
| [`Pages/CallOfCthulhuInitiative.html`](./Pages/CallOfCthulhuInitiative.html) | Call of Cthulhu combat tracker |
| [`Pages/Spells.html`](./Pages/Spells.html) | Searchable and filterable spell library |
| [`Pages/Spell-Display.html`](./Pages/Spell-Display.html) | Multi-spell comparison view |

## 👥 Team Members

| Name | GitHub |
| --- | --- |
| Cody Owens | [@TwistedFury](https://github.com/TwistedFury) |
| Cameron Troy | [@ScareCellar](https://github.com/ScareCellar) |
| Nicholas Beaty | [@BaconEater314](https://github.com/BaconEater314) |

## 🛠️ Technologies Used

| Category | Tools |
| --- | --- |
| **Front End** | HTML, CSS, JavaScript |
| **Back End** | Python |
| **Data** | JSON |
| **Version Control** | GitHub |

## ⚙️ Setup / Installation

No build step or package installation is required.

**1. Clone or download the repository**

```bash
git clone https://github.com/TwistedFury/HomebrewHub.git
```

**2. Open the project folder**

```bash
cd HomebrewHub/HomebrewHub
```

**3. Start the local server**

Run the included Python server so campaign and player changes can be saved to
the JSON data files:

```bash
python server.py
```

Then open `http://localhost:8000/index.html`.

The server runs on `http://localhost:8000` and serves both the web pages and
the JSON API. Opening pages directly from the file system may prevent API
requests from working.

If using VS Code Live Server on port 5500, keep `python server.py` running in
another terminal; the campaign and player pages automatically send their API
requests to port 8000.

## 🔌 API

The Python server exposes these endpoints:

- `GET /api/campaigns` — return all campaigns
- `POST /api/campaigns` — create a campaign
- `PATCH /api/campaigns/{campaign_id}` — update a campaign's player list
- `GET /api/players` — return all players
- `POST /api/players` — create a player
- `GET /api/players/{player_id}` — return one player
- `PATCH /api/players/{player_id}` — update a player

Campaigns are stored in [`Data/campaigns.json`](./Data/campaigns.json), and
players are stored in [`Data/players.json`](./Data/players.json). Campaign
records reference players by their `player_id`.

To open a specific campaign, pass its `campaign_id` in the URL:

```text
http://localhost:8000/Pages/Campaigns.html?id=nickb-1
```

Player records contain this information:

```json
{
  "player_id": "sample0-player-id",
  "name": "Alex Morgan",
  "character_name": "Elara Brightwood",
  "class": "Wizard",
  "level": 1,
  "max_hp": 10,
  "ac": 10,
  "attributes": {
    "strength": 10,
    "dexterity": 10,
    "constitution": 10,
    "intelligence": 10,
    "wisdom": 10,
    "charisma": 10
  }
}
```

Create saved players at [`Pages/Players.html`](./Pages/Players.html) while
`server.py` is running. The generated IDs can then be assigned to campaigns or
imported into the D&D combat tracker.
