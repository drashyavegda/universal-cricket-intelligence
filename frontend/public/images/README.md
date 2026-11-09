# images/

Intentionally empty. The interface is built entirely from CSS, SVG and chart primitives, so no
photography or illustration is bundled — that also means no image licensing, no large payloads and
nothing to re-export when the brand changes.

When you add an image:
* SVG first; otherwise WebP at 2× and under 200 KB.
* Place it at `public/images/<name>.webp` and reference it as `/images/<name>.webp`.
* Always set `width`/`height` (avoid layout shift) and `alt` text (empty for decorative).
* Do not hot-link external images: the sandboxed preview has no network access and the page would
  break for reviewers.
