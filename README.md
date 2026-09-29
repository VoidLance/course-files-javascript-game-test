# Adventure Quest

Adventure Quest is a browser-based, text-driven RPG built with HTML, CSS, and
vanilla JavaScript. Explore a dangerous dungeon, make risky choices, fight
enemies, improve your character, and try to defeat the final boss before your
turns run out.

## Why play Adventure Quest?

- **Choice-driven exploration:** Find treasure, events, upgrades, and combat as
  you make your way through the dungeon.
- **Turn-based combat:** Attack, cast spells using mana, or try to escape.
- **Character progression:** Earn points, level up, and buy permanent upgrades
  to health, mana, strength, agility, combat mastery, and lives.
- **A clear challenge:** Reach dungeon depth 10 and defeat the final boss within
  150 turns.
- **No installation or build step:** The game runs directly in a modern web
  browser.

## Get started

### Requirements

- A modern web browser with JavaScript enabled.
- An internet connection for the Font Awesome icons loaded from the CDN in
  `index.html`. The game itself is served locally.

### Run locally

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Select **Start New Game**, then use the on-screen controls to explore and
   play.

Alternatively, serve the project with a local static web server from the
repository directory:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

### Gameplay

- Select **Explore** to advance through the dungeon and encounter events.
- During combat, choose **Attack**, **Cast Spell**, or **Run Away**.
- Select **Rest** outside combat to recover health and mana; resting uses a
  turn.
- Spend earned points in the **Shop** on character upgrades.
- Watch your turn counter and dungeon depth. Defeat the final boss at depth 10
  before reaching the 150-turn limit.

## Project files

- [`index.html`](index.html) contains the game interface and embedded styles.
- [`script.js`](script.js) implements game state, exploration, combat, the shop,
  and user-interface updates.
- [`gamestate_discussion.txt`](gamestate_discussion.txt) contains notes about
  the centralized game-state pattern used by the game.

There are no package dependencies, build scripts, or automated tests in this
repository.

## Help

For questions or to report a problem, [open an issue in this
repository](https://github.com/VoidLance/course-files-javascript-game-test/issues).
For information about the game-state design, see
[`gamestate_discussion.txt`](gamestate_discussion.txt).

## Maintainers and contributing

This project is maintained by its repository maintainers and contributors. To
contribute, open an issue to discuss a proposed change, then submit a pull
request with a focused description of what changed. Keep the game runnable as a
static browser project and verify changes by opening `index.html` and trying
the affected gameplay controls.
