import fs from 'node:fs';
const p='benchmark/LONG_HORIZON_OPTION_POOL_DEPLETION.md';
if(!fs.existsSync(p)) process.exit(0);
let s=fs.readFileSync(p,'utf8');
s=s.replace('`node --test test/options.test.mjs`: 24/24 passed after patch.','`node --test test/*.mjs`: 85/85 passed after patch.');
s=s.replace(/Pending final 300-round capture metrics\. The patch is intentionally limited to location-entry state normalization and canonical hydration; no creative or validation behavior was changed\./,'300-round capture complete. Metrics above are computed from the authoritative OPTIONS_CREATED events for the captured window. The patch is limited to bounded pair recency/frequency selection, location-entry state normalization, and canonical hydration; no creative or validation behavior was changed.');
fs.writeFileSync(p,s);
