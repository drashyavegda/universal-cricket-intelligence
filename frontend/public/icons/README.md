# icons/

Intentionally empty. All interface iconography comes from `lucide-react` (tree-shaken, sized
inline), which keeps the bundle small and the visual language consistent.

Add a file here only for:
* Social/brand icons that lucide does not provide (SVG, 24×24 viewBox, `currentColor` fill).
* PWA shortcut icons.

Naming: `kebab-case.svg`. Reference from a component as `/icons/<name>.svg` with `aria-hidden="true"`
when the icon is decorative and an accessible label when it is the only content of a control.
