# The paper

- **Look:** the same newspaper every day: black and white, a blackletter masthead, serif type and the same boxes in the
  same places. Only the small decorations change (a pattern band, the weather drawing, the section marks, box corners),
  picked from the weather, weekday, Islamic month and season. Don't redesign it. Change the words.
- **Pages:** 1 Today (weather, what to wear, prayer or day strip, to-dos, day plan, deadlines) · 2 Money & Messages ·
  3 Work, Faith & You · Sundays 4 The Week.
- **Files:** `me\editions\<date>.json` (the words) → `node paper\build.mjs <json> <pdf>` → `me\papers\<date>.pdf`.
  The HTML next to the PDF can be opened in Edge to check the layout.
- **Keys:** see `kit\paper\sample-edition.json`. Optional sections disappear when their key is missing.
- **Fit:** the build prints `overflow px per page: 0, 0, 0`. A number above 0 means that page runs past the bottom, so
  shorten the text on that page.
- **Settings it uses:** `paper_name`, `place_label`, `call_me` (in the page-3 footer), `faith` ("islam" shows "The Day
  Between Prayers" and "Have a blessed day"; "none" shows "Your Day Plan").
- **Fonts:** UnifrakturMaguntia, Old Standard TT, Playfair Display, Libre Franklin and Amiri, all free (SIL Open Font
  License). npm installs them into `node_modules\@fontsource`.
- **Printing it:** see `printer-hp.md`. The **Print** tab in Jarvis shows today's paper, earlier papers, and Print it / Build again.

## Troubleshooting
- "playwright-core is missing": run `npm install` in the Jarvis folder.
- "Executable doesn't exist … msedge": Edge is missing or in an unusual place. Set `CHROME_PATH` to msedge.exe or chrome.exe.
- Squares instead of letters: the fonts didn't install. Run `npm install` again.
- Arabic looks broken: make sure `ayah.ar` is real Arabic text (copied from a trusted Quran source), not a transliteration.
