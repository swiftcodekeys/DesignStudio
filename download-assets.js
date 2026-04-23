// download-assets.js — Downloads all fence model/texture files from Ultra
// Run: node download-assets.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.ultrafence.com/design-studio/fence/';
const OUT = path.join(__dirname, 'fence_tool');

const files = [
  // Posts (m/0/)
  'm/0/pot.json', 'm/0/pob.json', 'm/0/pors.jpg',

  // Top rails (m/1/)
  'm/1/rtf2.json', 'm/1/gsrtf2.json',
  'm/1/rts1.json', 'm/1/gsrts1.json',
  'm/1/rtb2.json', 'm/1/gsrtb2.json',
  'm/1/rtf2c.json', 'm/1/gsrtf2c.json',
  'm/1/rts1c.json', 'm/1/gsrts1c.json',
  'm/1/grd128T.jpg', 'm/1/grd128L.jpg', 'm/1/grd128R.jpg',

  // Bottom rails (m/2/)
  'm/2/rbs.json', 'm/2/grbs.json',

  // Picket tops (m/3/)
  'm/3/ptf200.json', 'm/3/gsptf200.json',
  'm/3/ptf250.json', 'm/3/gsptf250.json',
  'm/3/ptf201.json', 'm/3/gsptf201.json',
  'm/3/pts100.json', 'm/3/gspts100.json',
  'm/3/ptb200.json', 'm/3/gsptb200.json',
  'm/3/ptf201c.json', 'm/3/gsptf201c.json',
  'm/3/gashd.jpg',

  // Picket bottoms (m/4/)
  'm/4/pbs.json', 'm/4/pbd.json',
  'm/4/gpbs.json', 'm/4/gpbd.json',

  // Finials (m/5/)
  'm/5/fn100s.json', 'm/5/fn100t.json', 'm/5/fn100q.json', 'm/5/fn100p.json',
  'm/5/gsfn100s.json', 'm/5/gsfn100t.json', 'm/5/gsfn100q.json', 'm/5/gsfn100p.json',
  'm/5/fn250s.json', 'm/5/fn250t.json', 'm/5/fn250q.json', 'm/5/fn250p.json',
  'm/5/gsfn250s.json', 'm/5/gsfn250t.json', 'm/5/gsfn250q.json', 'm/5/gsfn250p.json',
  'm/5/fn150s.json', 'm/5/fn150t.json', 'm/5/fn150q.json', 'm/5/fn150p.json',
  'm/5/fn300s.json', 'm/5/fn300t.json', 'm/5/fn300q.json', 'm/5/fn300p.json',
  'm/5/fn350s.json', 'm/5/fn350t.json', 'm/5/fn350q.json', 'm/5/fn350p.json',

  // Puppy pickets (m/6/)
  'm/6/pupcl.json', 'm/6/gpupcl.json',
  'm/6/pupst.json', 'm/6/gpupst.json',
  'm/6/pupfl.json', 'm/6/gpupfl.json',

  // Puppy finials (m/7/)
  'm/7/fn100s.json', 'm/7/gfn100s.json',
  'm/7/fn100t.json', 'm/7/gfn100t.json',
  'm/7/fn100q.json', 'm/7/gfn100q.json',
  'm/7/fn100p.json', 'm/7/gfn100p.json',

  // Post caps + accents (m/8/)
  'm/8/pcf.json',
  'm/8/accir.json', 'm/8/gsaccir.json',
  'm/8/acbut.json', 'm/8/gsacbut.json',
  'm/8/acscr.json',

  // HDR environment maps
  't/hdr_fr/px.hdr', 't/hdr_fr/nx.hdr', 't/hdr_fr/py.hdr',
  't/hdr_fr/ny.hdr', 't/hdr_fr/pz.hdr', 't/hdr_fr/nz.hdr',
  't/hdr_ba/px.hdr', 't/hdr_ba/nx.hdr', 't/hdr_ba/py.hdr',
  't/hdr_ba/ny.hdr', 't/hdr_ba/pz.hdr', 't/hdr_ba/nz.hdr',

  // Background images
  't/fb.jpg', 't/bb.jpg',

  // Foreground overlays
  't/ffs.png', 't/ffd.png', 't/fff.png', 't/ffp.png', 't/ffplt.png',
  't/bfp.png', 't/bff.png',

  // Bump map
  't/bm.jpg',

  // Thumbnails
  'th/th_st_uaf_200.jpg', 'th/th_st_uaf_250.jpg', 'th/th_st_uaf_201.jpg',
  'th/th_st_uab_200.jpg', 'th/th_st_uas_100.jpg', 'th/th_st_uas_150.jpg',
  'th/th_st_uas_101.jpg', 'th/th_st_uas_300.jpg', 'th/th_st_uas_350.jpg',
];

function download(relPath) {
  return new Promise((resolve) => {
    const url = BASE + relPath;
    const outPath = path.join(OUT, relPath.replace(/\//g, path.sep));
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });

    const req = https.get(url, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          fs.writeFileSync(outPath, buf);
          const isJson = relPath.endsWith('.json');
          let info = { path: relPath, size: buf.length, status: 'ok' };
          if (isJson) {
            try {
              const j = JSON.parse(buf.toString());
              info.vertices = j.vertices ? j.vertices.length / 3 : 0;
              info.faces = j.faces ? j.faces.length : 0;
            } catch (e) {
              info.parseError = e.message;
            }
          }
          resolve(info);
        });
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        resolve({ path: relPath, status: 'redirect-' + res.statusCode, location: res.headers.location });
      } else {
        res.resume();
        resolve({ path: relPath, status: 'error-' + res.statusCode });
      }
    });
    req.on('error', (e) => {
      resolve({ path: relPath, status: 'network-error', error: e.message });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ path: relPath, status: 'timeout' });
    });
  });
}

async function main() {
  console.log('Downloading ' + files.length + ' files from Ultra fence tool...\n');
  const results = [];
  // Download 5 at a time
  for (let i = 0; i < files.length; i += 5) {
    const batch = files.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(download));
    batchResults.forEach((r) => {
      results.push(r);
      const icon = r.status === 'ok' ? 'OK' : 'FAIL';
      const size = r.size ? ` (${(r.size / 1024).toFixed(1)}KB)` : '';
      console.log(`[${icon}] ${r.path}${size}`);
    });
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.status !== 'ok').length;
  console.log(`\nDone: ${ok} ok, ${fail} failed out of ${results.length} total`);

  // Write manifest
  const manifest = {
    downloaded: new Date().toISOString().split('T')[0],
    source: BASE,
    total: results.length,
    ok: ok,
    failed: fail,
    files: results,
  };
  fs.writeFileSync(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
  console.log('Manifest written to fence_tool/MANIFEST.json');

  // List failures
  if (fail > 0) {
    console.log('\nFailed files:');
    results.filter(r => r.status !== 'ok').forEach(r => {
      console.log('  ' + r.path + ' → ' + r.status);
    });
  }
}

main().catch(console.error);
