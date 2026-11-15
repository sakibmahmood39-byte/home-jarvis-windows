import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderHtml } from '../paper/build.mjs';
const sample = JSON.parse(fs.readFileSync(new URL('../paper/sample-edition.json', import.meta.url)));

test('the paper uses his paper name, place and greeting', () => {
  const h = renderHtml(sample, { paper_name: 'The Test Times', place_label: 'Testville', call_me: 'Sam', faith: 'islam' });
  assert.match(h, /The Test Times/); assert.match(h, /Weather · Testville/); assert.match(h, /blessed day, Sam/); assert.match(h, /Between Prayers/);
  assert.equal((h.match(/class="page"/g) || []).length, 3);
});
test('without faith the strip and titles change', () => {
  const h = renderHtml({ ...sample, prayers: undefined, ayah: undefined, hadith: undefined, day_strip: [['Wake', '6:30 AM']] }, { paper_name: 'X', faith: 'none' });
  assert.match(h, /Your Day Plan/); assert.match(h, /Work &amp; You/); assert.doesNotMatch(h, /Ayah/);
});
test('Sundays add The Week', () => {
  const h = renderHtml({ ...sample, week: { done: ['a'], next: ['b'] } }, {});
  assert.equal((h.match(/class="page"/g) || []).length, 4);
});
test('text is escaped', () => {
  const h = renderHtml({ ...sample, alert: '<script>x</script>' }, {});
  assert.doesNotMatch(h, /<script>x/);
});
