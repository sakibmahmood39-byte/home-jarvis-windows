// Optional links to his own devices. Each one is off until he sets it up with Claude Code.
//   Home Assistant (lights, plugs, fans): settings.home_assistant.url + the token in me/ha-token.txt (never in settings).
//   Roku TV remote: settings.tv.roku_ip (the TV's own local control, no account needed).
import fs from 'node:fs';
import path from 'node:path';

export function createDevices(me, S) {
  const haUrl = () => String((S().home_assistant || {}).url || '').replace(/\/$/, '');
  const haToken = () => { try { return fs.readFileSync(path.join(me, 'ha-token.txt'), 'utf8').trim(); } catch { return ''; } };
  async function ha(p, body) {
    const r = await fetch(haUrl() + p, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${haToken()}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`the hub said ${r.status}`); return r.json();
  }
  async function homeList() {
    if (!haUrl() || !haToken()) return { list: [], error: 'Not connected. Ask Claude Code to connect your Home Assistant.' };
    try {
      const all = await ha('/api/states');
      const list = all.filter((e) => /^(light|switch|fan|humidifier|climate|media_player|sensor|binary_sensor)\./.test(e.entity_id)).map((e) => {
        const domain = e.entity_id.split('.')[0];
        return { id: e.entity_id, name: (e.attributes && e.attributes.friendly_name) || e.entity_id, domain, state: e.state, can_switch: ['light', 'switch', 'fan', 'humidifier'].includes(domain) };
      });
      return { list, error: '' };
    } catch (e) { return { list: [], error: e.message }; }
  }
  async function homeSet(id, on) {
    try { const domain = String(id).split('.')[0]; await ha(`/api/services/${domain}/turn_${on ? 'on' : 'off'}`, { entity_id: id });
      await new Promise((r) => setTimeout(r, 1200)); const st = await ha(`/api/states/${id}`);
      return { id, on, ok: st.state === (on ? 'on' : 'off'), message: st.state === (on ? 'on' : 'off') ? '' : 'Sent, but it did not confirm.' };
    } catch (e) { return { id, on, ok: false, message: e.message }; }
  }
  const roku = () => String((S().tv || {}).roku_ip || '').trim();
  async function rokuGet(p) { const r = await fetch(`http://${roku()}:8060${p}`, { signal: AbortSignal.timeout(4000) }); return r.text(); }
  async function rokuPost(p) { await fetch(`http://${roku()}:8060${p}`, { method: 'POST', signal: AbortSignal.timeout(4000) }); }
  async function tvState() {
    if (!roku()) return { ok: false, why: 'The TV is not connected. Ask Claude Code to connect your Roku TV.' };
    try { const x = await rokuGet('/query/active-app'); const m = /<app id="([^"]*)"[^>]*>([^<]*)</.exec(x); return { ok: true, app: m ? m[2] : 'Home', app_id: m ? m[1] : '' }; }
    catch { return { ok: false, why: 'The TV is not answering. Is it on and on the Wi-Fi?' }; }
  }
  const KEYS = new Set(['Home', 'Back', 'Select', 'Up', 'Down', 'Left', 'Right', 'Play', 'Rev', 'Fwd', 'VolumeUp', 'VolumeDown', 'VolumeMute', 'PowerOff', 'PowerOn', 'InstantReplay', 'Info']);
  async function tvKey(k) { if (!roku() || !KEYS.has(k)) return tvState(); try { await rokuPost(`/keypress/${k}`); } catch {} return tvState(); }
  async function tvLaunch(id) { if (!roku() || !/^[\w.-]+$/.test(String(id))) return tvState(); try { await rokuPost(`/launch/${id}`); } catch {} await new Promise((r) => setTimeout(r, 1500)); return tvState(); }
  return { homeList, homeSet, tvState, tvKey, tvLaunch, haConnected: () => !!(haUrl() && haToken()) };
}
