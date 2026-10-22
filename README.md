<div align="center">

# 🎲 Homebrew Hub

**A character and campaign companion built for Dungeon Masters who write their own rules.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 📖 Project Description

Homebrew Hub is a web-based character and campaign companion built for Dungeon Masters running homebrew campaigns.

Instead of forcing custom worlds into official-rule tools, it lets DMs define their own **races, classes, subclasses, backgrounds, and items** in a structured format. Players can then build, play, and level up characters directly from that custom content.

## ✨ Features

- 🧬 **Custom Content Creation:** define your own races, classes, subclasses, backgrounds, and items
- 🧙 **Character Building:** players create characters from the DM's homebrew options
- 📈 **Leveling Up:** advance characters using your world's own rules
- 🎲 **Dice Rolling:** integrated with Fantastic Dice

### 🚀 Stretch Goals

- 🤖 AI assistance
- 🎙️ Voice-to-Recap for session summaries

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
| **Libraries** | Fantastic Dice |
| **Stretch Goals** | AI, Voice-to-Recap |

## ⚙️ Setup / Installation

**1. Clone the repository**

```bash
git clone https://github.com/TwistedFury/HomebrewHub.git
```

**2. Open the project folder**

```bash
cd HomebrewHub
```

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

**4. Explore**

Start building or viewing Homebrew Hub pages from the `Pages/` directory as needed.

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
use each value in the URL. Use `server.py` while developing so campaign form
submissions are written to the JSON file.

---

<div align="center">

*Built with 🎲 and a lot of d20s.*

</div>
