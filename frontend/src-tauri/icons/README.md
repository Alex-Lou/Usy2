# Tauri icons

App icons are not committed yet. Generate them from a single source PNG
(1024×1024 recommended) with:

```bash
cd frontend
npm run tauri icon path/to/source.png
```

This produces `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`,
`icon.ico` (and mobile icons) in this directory, matching the paths listed
under `bundle.icon` in `tauri.conf.json`. `tauri build` will fail until these
files exist.
