# Strudel Workshop Notebook

An interactive web-based notebook for teaching live-coding music with Strudel. Each cell contains editable code that can be played to produce sound directly in the browser.

## What is this?

This notebook provides a hands-on learning experience for Strudel, a live-coding pattern language for making music. It includes:

- 6 lesson cells covering rhythm, repetition, melody, instruments, layering, and effects
- A mini challenge to combine all concepts
- A blank cell for free exploration
- Independent playback for each cell (play multiple at once to layer sounds)
- A global "Stop All Sounds" panic button

## How to run locally

1. Navigate to this directory in your terminal
2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open your browser to `http://localhost:8000`
4. Click Play on any cell to start making music

**Note:** Browsers require a user interaction before audio can start, so you'll need to click a Play button before any sound is produced.

## How to use in a workshop

- Project the page on a screen
- Walk through each cell in order, demonstrating the concepts
- Encourage participants to edit the code and experiment
- Use the "Stop All Sounds" button when things get chaotic
- Each cell has a Reset button to restore the original code

## Tech details

- Plain HTML/CSS/JS with no build step
- Uses the official `@strudel/repl` web component loaded via CDN
- Works offline once loaded
- Can be hosted on GitHub Pages or any static host

## Learn more

Visit [strudel.cc](https://strudel.cc) for full documentation and the online REPL.
