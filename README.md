# Cup Game - Interactive Live Streaming Game

A real-time interactive cup game that can be played during live streams on TikTok and YouTube. Players participate by commenting their cup choices, and the game progresses through multiple rounds with an elimination system.

## Features

- Real-time interaction with live stream viewers
- Multi-round cup game with elimination system
- Support for both TikTok and YouTube live streams
- WebSocket-based real-time updates
- Interactive web interface
- Automatic vote processing and round management
- Player qualification and disqualification tracking

## Project Structure

```
cupgame/
├── requirements.txt
├── tiktok/
│   ├── server.py
│   ├── index.html
│   ├── script.js
│   └── styles.css
└── youtube/
    ├── server.py
    ├── index.html
    ├── script.js
    └── styles.css
```

## Prerequisites

- Python 3.7+
- TikTok Live account
- YouTube channel with live streaming capabilities

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cupgame.git
cd cupgame
```

2. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Dependencies

- TikTokLive: For TikTok live stream integration
- pytchat: For YouTube live stream integration
- websockets: For real-time communication

## Usage

### TikTok Version

1. Update the TikTok username in `tiktok/server.py`:
```python
client = TikTokLiveClient(unique_id="@your_tiktok_username")
```

2. Start the TikTok server:
```bash
python tiktok/server.py
```

3. Open `tiktok/index.html` in a web browser to view the game interface.

### YouTube Version

1. Start the YouTube server:
```bash
python youtube/server.py
```

2. Open `youtube/index.html` in a web browser to view the game interface.

## How to Play

1. Start a live stream on your chosen platform (TikTok or YouTube)
2. Share the game interface URL with your viewers
3. Viewers participate by commenting numbers (1-5) representing their cup choice
4. The game progresses through multiple rounds:
   - Each round reduces the number of cups
   - Players who choose cups with red balls are eliminated
   - The game continues until one player remains or all players are eliminated

## Game Rules

- The game starts with 6 cups (5 rounds + 1)
- Each round reduces the number of cups by 1
- One cup contains a red ball in each round
- Players who choose the cup with the red ball are eliminated
- Players who choose empty cups advance to the next round
- The game ends when either:
  - One player remains (winner)
  - All players are eliminated (game over)

## Technical Details

- WebSocket server running on port 8765
- Real-time vote processing and game state updates
- Automatic round progression
- Player tracking and qualification system
- Responsive web interface

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- TikTokLive library for TikTok integration
- pytchat library for YouTube integration
- websockets library for real-time communication 