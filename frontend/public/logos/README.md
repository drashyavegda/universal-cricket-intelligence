# logos/

| File | Use |
| --- | --- |
| `mark.svg` | Square brand mark (manifest maskable icon, deck covers, favicon fallback) |

The in-application lockup ("Cricket Intelligence / Universal Platform") is CSS text plus a lucide
`CircleDot` glyph in `components/shell.tsx` and `components/public-chrome.tsx`, so it inherits the
theme and never needs a raster export.

Guidelines: two colours maximum (turf `#10B981` + gold `#D4A72C` on ink `#0A1020`); clear space of
one dot diameter; do not stretch or recolour outside the palette.
