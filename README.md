<div align="center">

# 🎲 Homebrew Hub

**A small browser-based toolkit for tabletop RPG sessions.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 📖 Project Description

Homebrew Hub is currently a collection of static HTML pages and JSON data for a tabletop RPG project. The implemented interactive feature is an initiative tracker; the repository also contains spell, campaign, and player data that can support future pages.

## ✨ Features

- ⚔️ **Initiative Tracker:** add one or more creatures with a name, initiative score, and hit points
- 🔢 **Initiative Sorting:** entries are displayed from highest initiative to lowest
- ❤️ **Group Hit Points:** track HP separately for each creature in a group
- 🗑️ **Encounter Controls:** remove individual entries or clear the entire encounter
- 📖 **Spell Data:** JSON files include spell data from the PHB, SCAG, and XGE, plus a standalone Fireball example page
- 🧙 **Campaign Data:** JSON files include sample campaign and player records

## 📁 Pages

| Page | Current status |
| --- | --- |
| [`index.html`](./index.html) | Redirects to the current landing page |
| [`homePage.html`](./homePage.html) | Placeholder landing page |
| [`Pages/Initiative.html`](./Pages/Initiative.html) | Functional initiative tracker |
| [`Pages/Spells.html`](./Pages/Spells.html) | Static Fireball spell reference |
| [`Pages/Campaigns.html`](./Pages/Campaigns.html) | Placeholder |

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

<<<<<<< HEAD
**3. Launch a page**

Open [`index.html`](./index.html) in a browser, or open [`Pages/Initiative.html`](./Pages/Initiative.html) directly to use the initiative tracker.
=======
**3. Start the local server**

Campaign creation writes to `Data/campaigns.json`, so run the included Python
server instead of opening the HTML file directly:

```bash
python server.py
```

Then open `http://localhost:8000/Pages/Campaigns.html`.

If you prefer VS Code Live Server, start `python server.py` separately and open
the page through Live Server. The campaign page automatically sends its API
requests to the Python server when Live Server uses port 5500.
>>>>>>> defc9de1f794b567f1084398d5a3c13a2f1fe448

For local development, serve the project directory with any static file server and open the page in a browser. The project does not currently include a build system, package manifest, or automated test suite.

## 🔭 Future Work

<<<<<<< HEAD
The campaign page, landing page, and data-backed spell and campaign views are not implemented yet. Character creation, leveling, dice rolling, AI assistance, and voice-to-recap are also planned ideas rather than current functionality.
=======
## 🌐 GitHub Pages deployment

This is a static site, so GitHub Pages serves the HTML, JavaScript, CSS, and JSON
directly. The included `.github/workflows/deploy-pages.yml` deploys the repository
when changes are pushed to `main`.

1. Push the project to GitHub and open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Push to `main` or run **Deploy static site to GitHub Pages** from the Actions tab.

The campaign page reads the `id` query parameter and selects that record from
`Data/campaigns.json`:

```text
https://<owner>.github.io/<repository>/Pages/Campaigns.html?id=nickb-1
```

For example, the campaign in the sample data is available with:

```text
Pages/Campaigns.html?id=nickb-1
```

Add more records to `Data/campaigns.json` with unique `campaign_id` values and
use each value in the URL. Each campaign can include a `players` array of IDs
from `Data/players.json`; the campaign detail view resolves those IDs into
searchable player cards. Use `server.py` while developing so campaign form
submissions are written to the JSON file.

Player records use this shape:

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

Create saved players at `Pages/Players.html` while running `server.py`.
The generated player IDs can then be selected when managing campaign players.

Other pages can retrieve one player by ID with:

```text
GET /api/players/{player_id}
```

For example, `GET /api/players/sample0-player-id` returns the complete player
record, including attributes, max HP, and armor class. A missing player returns
`404` with a JSON error.

---

<div align="center">

*Built with 🎲 and a lot of d20s.*

</div>
>>>>>>> defc9de1f794b567f1084398d5a3c13a2f1fe448
