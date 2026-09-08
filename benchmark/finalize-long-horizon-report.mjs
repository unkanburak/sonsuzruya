import fs from 'node:fs';
const p='benchmark/LONG_HORIZON_OPTION_POOL_DEPLETION.md';
let s=fs.readFileSync(p,'utf8');
s=s.replace(/Pending final 300-round capture metrics\. The patch is intentionally limited to location-entry state normalization and canonical hydration; no creative or validation behavior was changed\./, 'NOT READY FOR LAUNCH\n\nRecovery/pool depletion is strongly reduced (library 298/300, exhausted recovery 2; maximum recovery streak 1), but exact/semantic pair repeats remain 53.3%, above the preferred 10% long-horizon quality target. No further patch was applied in this task.');
fs.writeFileSync(p,s);
