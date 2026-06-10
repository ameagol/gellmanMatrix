# gellmanMatrix

An Obsidian plugin that turns any Markdown list tree into a frozen-pane weekly progress matrix — like a spreadsheet, but living in your vault.

## Features

- Reads any `.md` file with an indented list tree
- Week columns generated dynamically from `::start` / `::end` dates
- Frozen tree panel (left) and frozen header (top) — only the week grid scrolls
- Click a leaf row to cycle status colour (pending → in-progress → at-risk → blocked → done)
- Click a week cell to set a weekly status
- Double-click a week cell to add a note — saved as `::note:` children in the `.md` file
- All state persisted directly in the source `.md` file — no JSON, no database

## Format

Add these four lines anywhere in your `.md` file (typically at the top):

```markdown
- ::gellmanMatrix
- ::title: My Project
- ::start: 06-26
- ::end: 12-27
```

Then write your tree as a normal indented list. The plugin reads it, ignoring all `::` directive lines in the rendered view.

### Status on a leaf item
```markdown
- My task ::status: in-progress
```

### Week note on a leaf item
```markdown
- My task ::status: done
    - ::note: { status: in-progress, date: Jun 2026 W1, comment: Started analysis }
    - ::note: { date: Jul 2026 W2, comment: Review complete }
```

## Status values

| Value | Colour |
|---|---|
| `pending` | Grey |
| `in-progress` | Yellow |
| `at-risk` | Orange |
| `blocked` | Red |
| `done` | Green |

## Usage

1. Install the plugin in `.obsidian/plugins/matrix-gellman/`
2. Enable it in Obsidian → Settings → Community Plugins
3. Open any `.md` file with a list tree
4. Run `Ctrl+P` → **MatrixGellman: track active file**
5. The matrix view opens tracking that file

## Development

```bash
npm install
npm run build   # builds main.js
npm run dev     # watch mode
```

Requires Node.js 18+.
