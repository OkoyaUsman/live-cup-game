import json
import time
import random
import asyncio
import pytchat
import threading
import websockets
from typing import Dict, List

port = 8765
votes = []
client = pytchat.create(video_id="fgGwnbHowqo")

class GameConfig:
    def __init__(self):
        self.round = 1
        self.total_rounds = 4
        self.current_cups = self.total_rounds+1
        self.votes: List[Dict] = []
        self.qualified_players: List[str] = []
        self.disqualified_players: List[str] = []
        self.cups: List[Dict] = []
        self.game_over = False
        self.game_finished = False
        self.allowed_voters = set()
        self.latest_votes = []
        self.initialize_cups()

    def initialize_cups(self):
        self.cups = []
        for i in range(self.current_cups):
            self.cups.append({
                "number": i+1,
                "red": False,
            })
        red_ball_cup = random.randint(0, self.current_cups - 1)
        self.cups[red_ball_cup]["red"] = True

    def get_config(self):
        return {
            "round": self.round,
            "totalRounds": self.total_rounds,
            "currentCups": self.current_cups,
            "qualifiedPlayers": self.qualified_players,
            "disqualifiedPlayers": self.disqualified_players,
            "cups": self.cups,
            "gameOver": self.game_over,
            "gameFinished": self.game_finished
        }

    def process_votes(self):
        self.qualified_players = []
        self.disqualified_players = []
        self.allowed_voters = set()
        
        for vote in self.votes:
            try:
                cup_number = vote["cup"]
                player = vote["player"]
                
                if self.cups[cup_number-1]["red"]:
                    self.disqualified_players.append(player)
                else:
                    self.qualified_players.append(player)
                    self.allowed_voters.add(player)
            except Exception as e:
                print(f"Error processing vote: {e}")

        if self.round >= self.total_rounds:
            if self.qualified_players:
                self.game_finished = True
            else:
                self.game_over = True
        if not self.qualified_players:
            self.game_over = True

        return self.get_config()
    
    def next_round(self):
        if self.round < self.total_rounds:
            self.round += 1
            self.current_cups -= 1
            self.votes = []
            self.latest_votes = []
            self.initialize_cups()
        else:
            if self.qualified_players:
                self.game_finished = True
            else:
                self.game_over = True
        if not self.qualified_players:
            self.game_over = True

        return self.get_config()

    def remove_vote(self, player: str) -> List[Dict]:
        self.votes = [d for d in self.votes if d.get("player") != player]

    def get_votes(self) -> List[Dict]:
        forge_test_votes(20, self.current_cups)
        recent_votes = [vote for vote in votes if vote["timestamp"] >= int(time.time()) - 5]
        new_votes = 0
        for vote in recent_votes:
            if self.round == 1:
                self.allowed_voters.add(vote["player"])
            player = vote["player"]
            if player in self.allowed_voters:
                if player not in self.latest_votes:
                    self.latest_votes.append(player)
                    new_votes += 1
                self.remove_vote(player)
                self.votes.append(vote)
        return new_votes


def poll_comment():
    global votes
    print("Started polling live chat messages.")
    while client.is_alive():
        for chat in client.get().sync_items():
            print(f"{chat.datetime} [{chat.author.name}]- {chat.message}")
            cup = extract_last_digit(chat.message)
            if cup is not None:
                votes.append({
                    "player": chat.author.name,
                    "cup": cup,
                    "timestamp": int(chat.timestamp/1000)
                })

def extract_last_digit(text: str) -> int | None:
    digits = [int(d) for d in text if d.isdigit()]
    return digits[-1] if digits else None

def forge_test_votes(quantity=100, max_cup_range=2):
    global votes
    for player in [f"bot_player_{i}" for i in range(1, quantity+1)]:
        votes.append({
            "player": player,
            "cup": random.randint(1, max_cup_range),
            "timestamp": int(time.time())
        })

async def handle_client(websocket):
    game_config = GameConfig()
    client_id = id(websocket)
    print(f"New client connected: {client_id}")

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if "type" in data:
                    if data["type"] == "get_config":
                        await websocket.send(json.dumps({
                            "type": "config",
                            "data": game_config.get_config()
                        }))
                    elif data["type"] == "get_result":
                        await websocket.send(json.dumps({
                            "type": "result",
                            "data": game_config.process_votes()
                        }))
                    elif data["type"] == "get_votes":
                        await websocket.send(json.dumps({
                            "type": "votes",
                            "data": game_config.get_votes()
                        }))
                    elif data["type"] == "next_round":
                        await websocket.send(json.dumps({
                            "type": "next_round",
                            "data": game_config.next_round()
                        }))
                    elif data["type"] == "reset":
                        game_config = GameConfig()
            except json.JSONDecodeError:
                print(f"Invalid JSON received from client {client_id}")
                
    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected: {client_id}")

async def main():
    threading.Thread(target=poll_comment).start()
    server = await websockets.serve(handle_client, "localhost", port, ping_interval=None)
    print(f"WebSocket server started on ws://localhost:{port}")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main()) 