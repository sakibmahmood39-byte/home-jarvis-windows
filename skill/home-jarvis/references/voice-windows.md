# Voice on Windows

- **Hearing him:** the Jarvis window uses Edge's built-in speech recognition (the microphone audio goes to Microsoft's
  speech service to be turned into text, like Windows voice typing). It needs the internet.
- **Speaking:** Windows voices through Edge. The "Microsoft … Online (Natural)" voices sound the most human. Pick one in
  the **Voices** tab (Hear, then Use).
- **Talking to it:** with **Always listening** on (Settings › Voice and listening, on by default) just say the wake word
  first: "Jarvis, when is Asr?" Or press **Ctrl+Space** (or double-click the core) for one question without the wake word.
  It stops listening while it speaks, so it doesn't hear itself. The status line says Listening / Thinking / Speaking.
- **Voice never unlocks Jarvis.** Anyone can talk to it, and private things still need Windows Hello or the PIN. "Jarvis,
  unlock" opens the Windows Hello box on screen. Never say the PIN out loud.
- **"Jarvis, lock"** locks at once. "Jarvis, open Today / Print / Prayer / House…" switches tabs. "Jarvis, change your look to Arc" switches the look.

## First time
1. Press Ctrl+Space. Edge asks to use the microphone: click **Allow**.
2. Windows: **Settings › Privacy & security › Microphone** must allow desktop apps and Microsoft Edge.
3. **Settings › Time & language › Speech**: pick his language. Natural voices download by themselves in Edge.

## Troubleshooting
- "The microphone is blocked": in the Jarvis window press Ctrl+L if the address bar is hidden, or open
  `edge://settings/content/microphone`, and allow `http://127.0.0.1:3777`.
- It hears but gets words wrong: set `voice.lang` (for example en-GB or en-IN) to match his accent, or use a
  headset mic.
- It stops listening after a while: Edge ends long sessions, and Jarvis restarts it automatically when always-listening is on.
  If not, turn the switch off and on.
- No voice comes out: check the Windows volume and output device, then pick another voice in Voices.
