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

**3. Launch a page**

Open [`index.html`](./index.html) in a browser, or open [`Pages/Initiative.html`](./Pages/Initiative.html) directly to use the initiative tracker.

For local development, serve the project directory with any static file server and open the page in a browser. The project does not currently include a build system, package manifest, or automated test suite.

## 🔭 Future Work

The campaign page, landing page, and data-backed spell and campaign views are not implemented yet. Character creation, leveling, dice rolling, AI assistance, and voice-to-recap are also planned ideas rather than current functionality.
