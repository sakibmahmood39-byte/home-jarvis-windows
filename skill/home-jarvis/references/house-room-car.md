# His house, room and car in 3D

The House, Room and Car tabs (and the Atlas look) draw simple 3D models from `me\settings.json`. Start from his answers.
Nothing here is measured by machine, and rough is fine. Restart Jarvis to see a change.

## House: `house.rooms`
A list of rooms on a simple floor plan, in metres. `x` runs across the house, `z` runs from the front door to the
back, and each room is a rectangle:
```json
"house": { "rooms": [
  { "name": "Entry", "x": [3, 4.3], "z": [0, 3], "hall": true },
  { "name": "Living room", "x": [4.3, 8.6], "z": [0, 4.6] },
  { "name": "Kitchen", "x": [0, 3], "z": [0, 4.6] },
  { "name": "Your room", "label": "My room", "x": [4.3, 8.6], "z": [4.6, 9], "mine": true }
]}
```
- Ask him to walk you through the home from the front door: which room is on the left and right, then what comes next.
  Rough sizes are fine ("small", "big" → 2.5 m or 4 m).
- Exactly one room has `"mine": true`. That's the room the Room tab shows in detail. Hallways get `"hall": true`.
- Use first names or plain words for other people's rooms ("Parents' room"), or simply "Bedroom 2". It's his home, and
  the names show only in his own Jarvis.

## Room: `room`
His own room in feet: `width_ft` (across, from the left wall), `depth_ft` (from the back wall with the window),
`height_ft`, `window_x_ft` (the middle of the window along the back wall), and `items`:
```json
"room": { "width_ft": 11, "depth_ft": 12, "window_x_ft": 6, "items": [
  { "type": "bed", "x": 0.3, "z": 5, "w": 5, "d": 6.6 },
  { "type": "desk", "x": 6.8, "z": 0.3, "w": 4, "d": 2, "label": "Gaming PC" },
  { "type": "printer", "x": 9.3, "z": 3.2, "w": 1.5, "d": 1.5 },
  { "type": "shelf", "x": 0.3, "z": 0.3, "w": 3, "d": 1.3, "h": 6 },
  { "type": "tv", "x": 3, "z": 11.5, "w": 4, "d": 0.4 },
  { "type": "sofa", "x": 3, "z": 9, "w": 5, "d": 2.5 }
]}
```
- Types: bed, desk (screen and PC, clickable), printer (his HP, clickable, "Print today's paper"), tv (clickable),
  sofa, and anything else, which is drawn as a cabinet (shelf, wardrobe, dresser).
- `x`/`z` is the corner nearest the left and back walls, and `w`/`d` is the size, all in feet. A photo of his room helps.
  Ask him to describe where the bed, desk and printer are.

## Car: `car`
`{ "name": "Civic", "color": "#2b4a7a" }`. The Car tab draws a 3D car in his colour. Live car data (locked, fuel) shows
only if he connects a car service later and writes `me\car.json`. That's optional; never sign in for him.
