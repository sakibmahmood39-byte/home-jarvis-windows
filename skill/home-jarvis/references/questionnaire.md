# The get-to-know-you session

Goal: know his real day well enough that Jarvis talks like it knows him and the paper fits his life. Run it like a
friendly chat, not a form. Ask 3–5 questions at a time, use multiple-choice buttons where it helps (the
AskUserQuestion tool), accept rough voice-typed answers, and read for intent. After each round, say back in one or
two lines what you understood. Skip anything he doesn't want to answer.

**Never ask for, or write down:** passwords, PINs, card, bank, account or routing numbers, SSN, passport or ID numbers,
his exact home address, or anyone's health details. If he volunteers one, say "I'll leave that out on purpose" and don't
write it anywhere.

## Round 1 — You (5 min)
1. Your name, and what should Jarvis call you? ("Boss", your first name, a nickname…)
2. Which town or area are you in? Town only, used for the weather and prayer times. Look up its coordinates yourself
   and confirm the town name with him.
3. Celsius or Fahrenheit? 12- or 24-hour time?
4. Languages you speak. Should Jarvis ever answer in another language?
5. Faith: do you want prayer times on the paper and in Jarvis? If yes: which calculation method (ISNA = 2 for North
   America, Muslim World League = 3, Umm al-Qura = 4, Egyptian = 5, Karachi = 1) and Asr Hanafi or standard? Which
   masjid do you go to?

## Round 2 — Your day (5–7 min)
6. What time do you usually wake up, and what time do you want the paper printed and waiting?
7. Work or study: what do you do, which days, which hours? Commute?
8. What's fixed every week? (gym, classes, family dinner, Jumu'ah, sports, a second job)
9. When are you most focused? When do you usually waste time?
10. What do you forget most often? (bills, replying to people, the gym, drinking water, calling family)

## Round 3 — Work, money, goals (5 min)
11. Your main work or business, and anything on the side. What are you working on right now?
12. Your top 3 goals for the next month, and one for this year.
13. Bills: which ones do you want on the paper, with the day each is due and roughly how much? **Names, dates and amounts
    only, never account numbers.**
14. Who do you often wait on (boss, clients, landlord, friends)? First names only.

## Round 4 — Where the paper gets its facts (5 min)
15. Calendar: Google or Outlook? Is it connected to Claude (claude.ai › Settings › Connectors)? If yes, the paper reads
    today's events. If no, offer to help him connect it (free), or use only his own answers.
16. Email: same question (Gmail or Outlook). The paper lists the top 5 emails that need him, read-only, and Jarvis
    never sends.
17. To-do list: does he use one (Todoist, Microsoft To Do, Google Tasks, notes)? Or should Jarvis keep it in
    `me\notes\todo.md`?
18. Anything else he wants each morning: news topics, a sports team, markets, a Quran ayah and hadith or a quote, a gym
    plan, a word of the day, something to learn.

## Round 5 — The front page, the paper and Jarvis's voice (5 min)
19. Show him the sample paper (`paper\sample-edition.json` built to PDF) and the Jarvis app. What should the paper be
    called? ("The <Surname> Times" is the default.)
20. Page 1 is his day: weather and what to wear, prayer times, to-dos, the day plan, deadlines. What would he move,
    drop or add? Pages 2–3 cover money and messages, then work, faith and him. Which sections can go?
21. How many to-dos is right: 5 or 8? Does he want blank lines to write on?
22. Both sides, or one side? Which printer? (Run `scripts\find-printer.ps1` now.)
23. Jarvis's personality: formal or casual? Short answers or more detail? Wake word "Jarvis" or something else?
24. Who else uses this PC or lives in the house? (So the lock makes sense to him, and their names go in
    `private_words`, the list of words that always lock.)

## Write it down
- `me\settings.json`: name, call_me, paper_name, place_label, lat, lon, timezone, units, faith, prayer_method,
  asr_school, voice.lang, voice.wake_word, printer, duplex, print_paper, build_time (about 30–45 min before he wants it
  in the tray), private_words (family first names, his workplace, his street, his car plate: words a guest should
  never hear Jarvis say), owner_tools / paper_tools (add his connector tools here only if he connected them).
- `me\profile.md`: his answers as short facts under the headings in `me.example\profile.md`.
- `me\PAPER.md`: copy `references\paper-runbook-template.md`, then fill every `<…>` from his answers.
- `me\notes\tonight-questions.md`: 6 short evening questions Jarvis can ask (top 3 done? new to-dos? money to remember?
  who are you waiting on? how was the gym? anything to learn?).
Then show him a 6–8 line summary and fix anything he corrects.
