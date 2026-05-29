# FlowScore

A simple browser-based PDF autoscroller for musicians who need both hands free
while practicing.

## Pages

- index.html: simple front page for the product idea.
- app.html: focused PDF practice stand.

## First version

- Open a local PDF in the browser.
- Render pages with PDF.js.
- Show loading, ready, and PDF error states.
- Start, pause, and resume steady autoscroll.
- Adjust scroll pace and page size.
- Estimate scroll pace from BPM and page layout.
- Jump back or forward ten seconds, or return to the top.
- Use keyboard shortcuts: Space to play/pause, Arrow Left/Right to change speed,
  and Home to return to the top.

PDF files are read locally by the browser. This prototype does not upload music
or store user files.

## Product direction

The strongest product shape is a focused practice stand, not a general PDF
reader. The interface should stay quiet, large, and reliable enough to use from
an instrument distance.

Good next additions:

- Tap tempo or song-duration mode, so the scroll pace can match a piece.
- Foot pedal support through keyboard events or Bluetooth page-turn pedals.
- Set markers for repeats, codas, or difficult sections.
- Save per-song speed and zoom settings in local storage.
- Fullscreen performance mode with only the score and a subtle pause control.

## Local preview

Serve the folder with any static server and open index.html. For example:

```bash
python -m http.server 4173 --bind 127.0.0.1
```
