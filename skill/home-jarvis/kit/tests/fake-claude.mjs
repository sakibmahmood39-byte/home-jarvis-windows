// Stands in for "claude -p" in tests: records its arguments and prints FAKE_REPLY.
import fs from 'node:fs';
let input = ''; process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => {
  if (process.env.FAKE_ARGS_FILE) fs.writeFileSync(process.env.FAKE_ARGS_FILE, JSON.stringify({ args: process.argv.slice(2), input, cwd: process.cwd() }));
  process.stdout.write(process.env.FAKE_REPLY ?? 'ok');
});
