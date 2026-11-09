# fonts/

Intentionally empty — and it should stay that way unless you have a strong reason.

The application uses the **system font stack** (`ui-sans-serif, system-ui, -apple-system, Segoe UI,
Roboto, …` via Tailwind's default). Consequences:

* Zero font requests → no FOUT/layout shift, better Core Web Vitals.
* No third-party font CDN → no extra privacy disclosure, no consent implications.
* Glyph coverage for the UI languages the assistant accepts (English, Hindi, Gujarati queries) relies
  on the OS fonts; if you need guaranteed Devanagari/Gujarati rendering, self-host a subset here.

If you add a font: self-host the `.woff2` file, `font-display: swap`, self-host the licence text,
and update the privacy policy (currently: "no third-party font requests").
