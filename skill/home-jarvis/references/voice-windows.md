# Voice on Windows

- **Hearing him:** the Jarvis window uses Edge's built-in speech recognition (the microphone audio goes to Microsoft's
  speech service to be turned into text, like Windows voice typing). It needs the internet.
- **Speaking:** Windows voices through Edge. The "Microsoft … Online (Natural)" voices sound the most human. Pick one in
  the **Voices** tab (Test, then Use this voice).
- **Talking to it:** press the glowing circle left of the talk bar for one question. Or turn on **Always listening** in
  Voices and start with the wake word: "Jarvis, when is Asr?" It stops listening while it speaks, so it doesn't hear itself.
- **Voice never unlocks Jarvis.** Anyone can talk to it, and private things still need Windows Hello or the PIN. "Jarvis,
  unlock" opens the Windows Hello box on screen. Never say the PIN out loud.
- **"Jarvis, lock"** locks at once. "Jarvis, open Today / Paper / Prayer…" switches tabs.

## First time
1. Press the circle. Edge asks to use the microphone: click **Allow**.
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
