import json
import os
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
CAMPAIGNS_FILE = ROOT / "Data" / "campaigns.json"
PLAYERS_FILE = ROOT / "Data" / "players.json"


def read_campaigns():
    with CAMPAIGNS_FILE.open(encoding="utf-8-sig") as file:
        campaigns = json.load(file)
    if not isinstance(campaigns, list):
        raise ValueError("Campaign data must be a JSON array.")
    return campaigns


def write_campaigns(campaigns):
    temporary_file = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=CAMPAIGNS_FILE.parent, delete=False
        ) as file:
            temporary_file = file.name
            json.dump(campaigns, file, indent=4)
            file.write("\n")
        os.replace(temporary_file, CAMPAIGNS_FILE)
    finally:
        if temporary_file and os.path.exists(temporary_file):
            os.unlink(temporary_file)


def read_players():
    with PLAYERS_FILE.open(encoding="utf-8-sig") as file:
        players = json.load(file)
    if not isinstance(players, list):
        raise ValueError("Player data must be a JSON array.")
    return players


def write_players(players):
    temporary_file = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=PLAYERS_FILE.parent, delete=False
        ) as file:
            temporary_file = file.name
            json.dump(players, file, indent=4)
            file.write("\n")
        os.replace(temporary_file, PLAYERS_FILE)
    finally:
        if temporary_file and os.path.exists(temporary_file):
            os.unlink(temporary_file)


class HomebrewHubHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/campaigns":
            try:
                self.send_json(200, read_campaigns())
            except (OSError, ValueError, json.JSONDecodeError) as error:
                self.send_json(500, {"error": str(error)})
            return
        if path == "/api/players":
            try:
                self.send_json(200, read_players())
            except (OSError, ValueError, json.JSONDecodeError) as error:
                self.send_json(500, {"error": str(error)})
            return
        super().do_GET()

    def do_OPTIONS(self):
        path = urlparse(self.path).path
        if path.startswith("/api/campaigns") or path == "/api/players":
            self.send_response(204)
            self.send_cors_headers()
            self.end_headers()
            return
        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in {"/api/campaigns", "/api/players"}:
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length))
            if path == "/api/players":
                player = self.validate_player(payload)
                players = read_players()
                player["player_id"] = self.create_player_id(players)
                players.append(player)
                write_players(players)
                self.send_json(201, player)
                return

            campaign = self.validate_campaign(payload)
            campaigns = read_campaigns()
            campaign["campaign_id"] = self.create_campaign_id(campaigns)
            campaigns.append(campaign)
            write_campaigns(campaigns)
            self.send_json(201, campaign)
        except (ValueError, TypeError, OSError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})

    def do_PATCH(self):
        path = urlparse(self.path).path
        prefix = "/api/campaigns/"
        if not path.startswith(prefix) or not path[len(prefix):]:
            self.send_error(404)
            return

        campaign_id = path[len(prefix):]
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            changes = json.loads(self.rfile.read(content_length))
            if not isinstance(changes, dict):
                raise ValueError("Campaign changes must be a JSON object.")

            campaigns = read_campaigns()
            campaign = next(
                (item for item in campaigns if item.get("campaign_id") == campaign_id),
                None,
            )
            if campaign is None:
                self.send_json(404, {"error": "Campaign not found."})
                return

            campaign["players"] = self.validate_players(changes.get("players", []))
            write_campaigns(campaigns)
            self.send_json(200, campaign)
        except (ValueError, TypeError, OSError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})

    @staticmethod
    def validate_campaign(campaign):
        if not isinstance(campaign, dict):
            raise ValueError("Campaign must be a JSON object.")

        name = str(campaign.get("name", "")).strip()
        dm = str(campaign.get("dm", "")).strip()
        description = str(campaign.get("description", "")).strip()
        character_level = campaign.get("character_level")
        players = campaign.get("players", [])

        if not name or not dm or not description:
            raise ValueError("Name, Dungeon Master, and description are required.")
        if not isinstance(character_level, int) or not 1 <= character_level <= 20:
            raise ValueError("Character level must be an integer from 1 to 20.")
        players = HomebrewHubHandler.validate_players(players)

        return {
            "name": name,
            "dm": dm,
            "character_level": character_level,
            "description": description,
            "players": players,
        }

    @staticmethod
    def validate_players(players):
        if not isinstance(players, list) or any(
            not isinstance(player, str) or not player.strip() for player in players
        ):
            raise ValueError("Players must be a list of player IDs.")

        player_ids = {player.get("player_id") for player in read_players()}
        players = list(dict.fromkeys(player.strip() for player in players))
        unknown_players = [player for player in players if player not in player_ids]
        if unknown_players:
            raise ValueError(
                f"Unknown player ID(s): {', '.join(unknown_players)}."
            )
        return players

    @staticmethod
    def create_campaign_id(campaigns):
        existing_ids = {campaign.get("campaign_id") for campaign in campaigns}
        campaign_id = f"campaign-{uuid4().hex[:8]}"
        while campaign_id in existing_ids:
            campaign_id = f"campaign-{uuid4().hex[:8]}"
        return campaign_id

    @staticmethod
    def validate_player(player):
        if not isinstance(player, dict):
            raise ValueError("Player must be a JSON object.")

        name = str(player.get("name", "")).strip()
        character_name = str(player.get("character_name", "")).strip()
        player_class = str(player.get("class", "")).strip()
        level = player.get("level")

        if not name or not character_name or not player_class:
            raise ValueError("Player name, character name, and class are required.")
        if not isinstance(level, int) or not 1 <= level <= 20:
            raise ValueError("Player level must be an integer from 1 to 20.")

        return {
            "name": name,
            "character_name": character_name,
            "class": player_class,
            "level": level,
        }

    @staticmethod
    def create_player_id(players):
        existing_ids = {player.get("player_id") for player in players}
        player_id = f"player-{uuid4().hex[:8]}"
        while player_id in existing_ids:
            player_id = f"player-{uuid4().hex[:8]}"
        return player_id

    def send_json(self, status, payload):
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def send_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin in {"http://127.0.0.1:5500", "http://localhost:5500"}:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header(
                "Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS"
            )
            self.send_header("Access-Control-Allow-Headers", "Content-Type")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("localhost", 8000), HomebrewHubHandler)
    print("Homebrew Hub running at http://localhost:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
