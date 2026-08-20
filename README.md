# Strudel Workshop Notebook

An interactive, **fully offline** web notebook for teaching live-coding music with Strudel.
Each cell holds editable code that plays sound directly in the browser — no internet, no
accounts, no CDN.

---

## Prerequisites

1. **Install [Node.js](https://nodejs.org) 18 or newer.** It's the only runtime you need —
   everything below runs on Node builtins with no other dependencies.
2. **Install [Git](https://git-scm.com/downloads)** and clone this repository:

   ```bash
   git clone https://github.com/synacktraa/strudel-demo-and-player.git
   cd strudel-demo-and-player
   ```

## The two commands

```bash
npm run setup
```

Downloads Strudel and its whole sample library into `app/vendor/`, then rewrites Strudel's
internal URLs to point there. **Needs internet — run it before you leave.** Takes roughly
20–30 minutes and about 215 MB. If it's interrupted, run it again: completed files are kept
and skipped.

```bash
npm run app
```

Starts the notebook and opens it in your browser. **Runs with no internet at all.** It
prints the URL too, and picks another port automatically if 8000 is taken.

That's the whole workflow.

---

## Checking a machine is ready

```bash
npm run verify
```

Runs offline in about a second and prints a per-item report:

```
  [ ok ] vendor manifest                profile "recommended", strudel 1.3.0
  [ ok ] strudel bundle                 2.1 MB
  [ ok ] no remote asset URLs in bundle 5 base URLs redirected to /vendor/
  [ ok ] audio worklet                  1 present
  [ ok ] sample maps                    7 present
  [ ok ] sample audio                   709 bank(s) spot-checked, all present
  [ ok ] soundfonts                     126 GM font file(s)
  [ ok ] last setup run                 clean
  [ ok ] index.html sub-resources       all local
```

It exits non-zero if anything is missing, so you can loop it over a room of machines.
`npm run app` does its own quick check on startup and tells you to run setup if assets
are missing.

### Setting up many machines

Nothing in `app/vendor/` is machine-specific. Run `npm run setup` once, then copy the whole
project folder to the other machines — far faster than 25 minutes each. Every machine still
needs Node.js installed.

---

## Layout

```
app/          everything that gets served — runs offline
  index.html  the notebook
  app.js      cell controls, keyboard shortcuts
  styles.css
  server.mjs  static server, Node builtins only
  vendor/     downloaded assets (gitignored — a build output, not source)

setup/        everything that needs internet — never runs at the workshop
  index.mjs   entry point for `npm run setup`
  vendor.mjs  downloads and rewrites the assets
  verify.mjs  the offline readiness report
  lib/

tests/
  unit/       fast, no dependencies
  e2e/        Playwright, with the internet blocked
```

A server is required rather than opening `index.html` directly: Strudel's AudioWorklet,
SharedWorker and sample loading are all blocked on `file://` URLs.

---

## What "offline" actually means here

The original notebook loaded five things over the network. All of them are now local:

| Was | Now |
|---|---|
| `unpkg.com/@strudel/repl@1` | `app/vendor/strudel/index.js` |
| `kit.fontawesome.com` icon kit | inline `<svg>` sprite in `index.html` |
| `raw.githubusercontent.com` sample maps + audio | `app/vendor/samples/` |
| `felixroos.github.io` GM soundfonts | `app/vendor/soundfonts/` |
| `unpkg.com/hydra-synth` | `app/vendor/hydra/` |

Verified in a real browser with all non-localhost traffic blocked: the page loads, every
cell plays, and **zero requests leave the machine**.

### What's included

- **All 16 default drum sounds** (`bd sd hh oh cp rim mt lt ht cr rd cb sh tb brk misc`)
- **All 683 drum-machine banks** — TR-808, TR-909, LinnDrum, and the rest, via `.bank()`
- **Dirt-Samples** (`casio crow insect wind jazz metal east space numbers`)
- **Sampled piano** (29 notes)
- **125 General MIDI instruments** (`gm_piano`, `gm_acoustic_bass`, `gm_epiano1`, …)
- All built-in synths (`sawtooth`, `triangle`, `sine`, `square`) — these need no samples

### What's not

- **VCSL orchestral library** (~2 GB) and **mridangam** (~39 MB) are skipped by default.
- `samples('github:...')` and `shabda(...)` fetch from the internet by design and will fail
  offline. Nothing in the notebook uses them.

To include more:

```bash
npm run setup -- --profile=generous
```

| Profile | Size | Contents |
|---|---|---|
| `lean` | ~25 MB | default kit, Dirt-Samples, piano, 20 drum machines, only the GM instruments the notebook names |
| `recommended` *(default)* | ~215 MB | everything above plus all 683 drum machines and one variant of all 125 GM instruments |
| `generous` | ~400 MB | adds mridangam and 3 variants per GM instrument |
| `full` | ~2.3 GB | adds the complete VCSL orchestral library |

---

## Using it in the workshop

- Project the page and walk through the cells in order.
- Each cell has its own **Play** button; cells layer, so you can run several at once.
- **Ctrl+Enter** plays the focused cell, **Ctrl+.** stops it.
- **Stop All Sounds** in the header is the panic button.
- Students edit the code in place and press Play again to hear the change.

The lesson cells ship with starter patterns:

| Cell | Concept | Starter |
|---|---|---|
| 1 | Rhythm | `s("bd hh sd hh")` |
| 2 | Repetition | `s("bd*2 hh*4 sd hh*2")` |
| 3 | Melody | `note("c e g e a g e c")` |
| 4 | Instruments | `note("c e g b").sound("sawtooth")` |
| 5 | Layering | `stack(...)` with drums + melody |
| 6 | Effects | `.room(0.6).delay(0.4)` |

---

## Troubleshooting

**"The offline assets are missing"** — `npm run setup` hasn't finished on this machine. Run
it somewhere with internet, or copy `app/vendor/` from a machine that has it.

**No sound at all** — browsers block audio until you interact with the page. Click any Play
button first. If it's still silent, check the system volume and output device.

**A cell says "sound not found"** — that bank wasn't vendored. Run `npm run verify` to see
what's present, or re-run setup with `--profile=generous`.

**Setup failed partway** — run it again. Completed files are kept and skipped.

**Want a specific port** — `node app/server.mjs --port=9000`.

---

## How it works

`setup/vendor.mjs` reads `app/index.html` to find which soundfonts and banks the lessons
actually use, so the demo cell's `gm_epiano1:1` pulls the second variant, not just the
first. `setup/lib/rewrite.mjs` patches the Strudel bundle's five hardcoded remote base
URLs and **throws if any expected URL is missing** — a future Strudel release that moves
its URLs fails loudly at setup rather than silently phoning home at the workshop.

## Development

```bash
npm test          # unit tests, no dependencies, ~1s
npm run test:e2e  # Playwright: loads the page with the internet blocked
npm run test:all
```

The E2E suite hard-aborts every non-localhost request, so a regression that reintroduces a
CDN can't pass by succeeding on a machine that happens to be online. Playwright is a
devDependency for the prep machine only — the notebook itself never needs it.

## Learn more

[strudel.cc](https://strudel.cc) has the full documentation and the online REPL
(internet required, obviously).
