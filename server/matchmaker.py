from http.server import BaseHTTPRequestHandler, HTTPServer
import json, time, random

queues = {}
tickets = {}

def key(game, wager):
    return f"{game}:{wager}"

class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        raw = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-headers", "content-type")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_POST(self):
        if self.path != "/join":
            return self._send(404, {"error": "not found"})
        n = int(self.headers.get("content-length", "0"))
        body = json.loads(self.rfile.read(n) or b"{}")
        game, wager, wallet = body.get("game"), str(body.get("wager", "")), body.get("wallet")
        if not game or not wager or not wallet:
            return self._send(400, {"error": "game, wager, wallet required"})
        ticket = f"{int(time.time())}-{random.randrange(100000,999999)}"
        player = {"ticket": ticket, "wallet": wallet, "game": game, "wager": wager, "status": "waiting", "matchId": None, "opponent": None}
        tickets[ticket] = player
        k = key(game, wager)
        waiting = next((p for p in queues.get(k, []) if p["status"] == "waiting" and p["wallet"] != wallet), None)
        if waiting:
            mid = f"m-{int(time.time())}"
            waiting["status"] = "matched"; waiting["matchId"] = mid; waiting["opponent"] = wallet
            player["status"] = "matched"; player["matchId"] = mid; player["opponent"] = waiting["wallet"]
        else:
            queues.setdefault(k, []).append(player)
        self._send(200, {"ticket": ticket, "status": player["status"]})

    def do_GET(self):
        if not self.path.startswith("/status/"):
            return self._send(404, {"error": "not found"})
        ticket = self.path.split("/status/")[1]
        player = tickets.get(ticket)
        if not player:
            return self._send(404, {"error": "ticket not found"})
        self._send(200, {"status": player["status"], "matchId": player["matchId"], "opponent": player["opponent"]})

    def log_message(self, *a):
        pass

print("matchmaker on 8787")
HTTPServer(("0.0.0.0", 8787), H).serve_forever()
