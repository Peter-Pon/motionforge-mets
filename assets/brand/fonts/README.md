# Brand fonts

**Archivo-ExtraBold.woff2** — Archivo ExtraBold (800), latin subset, 14 KB.
Licensed under the SIL Open Font License 1.1, see [OFL.txt](OFL.txt).

## Why it ships but is not used

The Dynmech VI lockup SVGs set the wordmark in Archivo ExtraBold. The shipped
splash artwork does not: measured against `dynmech-splash-*.png`, DynMech
Motion's wordmark is the Helvetica/Arial fallback — 465x62 at 1120x600, where
real Archivo at the same cap height comes out ~5% narrower with visibly rounder
bowls.

So the guide and the artwork disagree. `assets/splash.html` deliberately
follows the **artwork**, so the CycleView card sits next to the Motion card
without either looking wrong.

## Switching the family to Archivo

Worth doing — but do it for every product at once, not just this one:

1. Point `--wordmark-family` in `assets/splash.html` at
   `Archivo, 'Archivo Black', 'Helvetica Neue', Arial, sans-serif`.
2. Re-derive `--wordmark-size` / `--wordmark-tracking` and the two
   `--productline-*` values so the ink still measures 465x62 and 246x26.
3. Re-render the four PNGs under `../splash/`.
4. Re-render DynMech Motion's splash card the same way, or CycleView becomes
   the odd one out — which is exactly the problem this file exists to prevent.

Motion already carries `Archivo-Variable.ttf` and `ArchivoBlack-Regular.ttf`
in `3dmets/resources/brand/fonts/` — the fonts were always there, its splash
artwork simply was not rendered with them.
