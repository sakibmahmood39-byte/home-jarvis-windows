# The HP printer

## Find it
`powershell -File scripts\find-printer.ps1` lists every printer, HP first, with:
- Status: Normal means ready.
- Duplex: TwoSidedLongEdge means it can print both sides by itself.
- Default: whether Windows uses it when no printer is named.
Ignore the "Microsoft Print to PDF", "OneNote" and "Fax" entries.

## If the HP isn't listed
1. The printer must be on and on the same Wi-Fi as the PC (its screen or the HP Smart app shows the network).
2. Windows: **Settings › Bluetooth & devices › Printers & scanners › Add device**. Wait, then click **Add device**
   next to the HP. If it doesn't appear, click "Add manually" and choose "Add a printer using an IP address", using the IP
   from the printer's screen (Wireless › Network details).
3. Or install the free **HP Smart** app from the Microsoft Store and add the printer there. It also installs the driver.
4. Run `find-printer.ps1` again and copy the exact name into `me\settings.json` → `printer`.
HP+ printers sometimes need HP's own ink. Some need an HP account in HP Smart; that's his choice, never sign in for him.

## Print
`powershell -File scripts\print-paper.ps1 -Pdf me\papers\<date>.pdf -Printer "<exact name>" -Duplex`
- It uses **SumatraPDF** (free, installed by setup.ps1) so it prints silently, scaled to fit, both sides with `-Duplex`.
- Without SumatraPDF it falls back to Windows' own print command, which may open a window and print one side only.
- It waits until the job has left the queue. Only `PRINTED on …` means success. `NOT PRINTED` and `STUCK` say why.
- Check with him: right paper size (Letter), right way up, both sides readable (flip on the long edge).

## Troubleshooting
- Offline: turn the printer off and on, check the Wi-Fi, and in Printers & scanners › the HP › untick "Use printer offline".
- Prints one side only: the model may not have automatic two-sided printing. Set `duplex` to false.
- Jobs pile up: Printers & scanners › the HP › Open print queue › Cancel all, then print again.
- Blank pages or no colour: the paper is black and white on purpose; check the black ink or toner.
- Asks to sign in to HP: that's his account, so he does it himself.
