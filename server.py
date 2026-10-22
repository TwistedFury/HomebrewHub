import json
import os
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
CAMPAIGNS_FILE = ROOT / "Data" / "campaigns.json"


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


class HomebrewHubHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if urlparse(self.path).path == "/api/campaigns":
            try:
                self.send_json(200, read_campaigns())
            except (OSError, ValueError, json.JSONDecodeError) as error:
                self.send_json(500, {"error": str(error)})
            return
        super().do_GET()

    def do_OPTIONS(self):
        if urlparse(self.path).path == "/api/campaigns":
            self.send_response(204)
            self.send_cors_headers()
            self.end_headers()
            return
        self.send_error(404)

    def do_POST(self):
        if urlparse(self.path).path != "/api/campaigns":
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            campaign = json.loads(self.rfile.read(content_length))
            campaign = self.validate_campaign(campaign)
            campaigns = read_campaigns()
            campaign["campaign_id"] = self.create_campaign_id(campaigns)
            campaigns.append(campaign)
            write_campaigns(campaigns)
            self.send_json(201, campaign)
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
        player_count = campaign.get("player_count")

        if not name or not dm or not description:
            raise ValueError("Name, Dungeon Master, and description are required.")
        if not isinstance(character_level, int) or not 1 <= character_level <= 20:
            raise ValueError("Character level must be an integer from 1 to 20.")
        if not isinstance(player_count, int) or player_count < 1:
            raise ValueError("Player count must be a positive integer.")

        return {
            "name": name,
            "dm": dm,
            "character_level": character_level,
            "description": description,
            "player_count": player_count,
        }

    @staticmethod
    def create_campaign_id(campaigns):
        existing_ids = {campaign.get("campaign_id") for campaign in campaigns}
        campaign_id = f"campaign-{uuid4().hex[:8]}"
        while campaign_id in existing_ids:
            campaign_id = f"campaign-{uuid4().hex[:8]}"
        return campaign_id

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
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
