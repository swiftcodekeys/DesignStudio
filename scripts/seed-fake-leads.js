// Seed fake leads into the Grandview CRM worker.
// Run: node scripts/seed-fake-leads.js

const ENDPOINT = 'https://grandview-crm.sarah-13a.workers.dev/leads';

function quoteId() {
  return 'GV-' + Math.floor(100000 + Math.random() * 900000);
}

const fakeLeads = [
  {
    quoteId: quoteId(),
    Name: 'Amanda Reyes',
    Email: 'amanda.reyes+test@example.com',
    Phone: '517-555-0142',
    ZIP: '48823',
    followUpPref: 'email',
    installPlan: 'self-install',
    shippingAddress: {
      line1: '4428 Maplewood Dr',
      city: 'East Lansing',
      state: 'MI',
      zip: '48823',
    },
    zones: [
      {
        zoneId: 'back',
        zoneName: 'Backyard',
        style: 'haven',
        grade: 'residential',
        height: '48',
        color: 'gloss-black',
        linearFootage: 180,
        corners: 4,
        gateCount: 1,
        items: [
          { sku: 'UAB-200', qty: 30, unit: 'panel', desc: 'Haven 48" 3-Rail Flush', price: 168.00, total: 5040.00 },
          { sku: 'UAB-200W', qty: 1, unit: 'gate', desc: "48\" Walk Gate (48\"W)", price: 471.75, total: 471.75 },
          { sku: 'POST-2x2-080', qty: 31, unit: 'post', desc: '2" Residential Post', price: 58.50, total: 1813.50 },
          { sku: 'MAGNALATCH', qty: 1, unit: 'ea', desc: 'MagnaLatch (pool code)', price: 186.50, total: 186.50 },
          { sku: 'TRUCLOSE-HD', qty: 1, unit: 'pair', desc: 'TruClose Heavy Duty hinges', price: 95.50, total: 95.50 },
        ],
        subtotal: 7607.25,
      },
    ],
    grandTotal: 7607.25,
    source: 'quote-builder-wizard',
  },
  {
    quoteId: quoteId(),
    Name: 'David Kowalski',
    Email: 'dkowalski+test@example.com',
    Phone: '248-555-0371',
    ZIP: '48009',
    followUpPref: 'phone',
    installPlan: 'installer-referral',
    shippingAddress: {
      line1: '812 Oakview Ln',
      city: 'Birmingham',
      state: 'MI',
      zip: '48009',
    },
    zones: [
      {
        zoneId: 'back',
        zoneName: 'Backyard',
        style: 'charleston',
        grade: 'residential',
        height: '60',
        color: 'textured-black',
        linearFootage: 240,
        corners: 6,
        gateCount: 1,
        items: [
          { sku: 'UAS-100', qty: 40, unit: 'panel', desc: 'Charleston 60" 3-Rail', price: 191.50, total: 7660.00 },
          { sku: 'UAS-100W', qty: 1, unit: 'gate', desc: "48\" Walk Gate", price: 507.00, total: 507.00 },
          { sku: 'POST-2x2-080', qty: 42, unit: 'post', desc: '2" Residential Post', price: 68.25, total: 2866.50 },
        ],
        subtotal: 11033.50,
      },
      {
        zoneId: 'front',
        zoneName: 'Front Yard',
        style: 'charleston',
        grade: 'residential',
        height: '48',
        color: 'textured-black',
        linearFootage: 90,
        corners: 2,
        gateCount: 0,
        items: [
          { sku: 'UAS-100', qty: 15, unit: 'panel', desc: 'Charleston 48" 3-Rail', price: 176.00, total: 2640.00 },
          { sku: 'POST-2x2-080', qty: 16, unit: 'post', desc: '2" Residential Post', price: 58.50, total: 936.00 },
        ],
        subtotal: 3576.00,
      },
    ],
    grandTotal: 14609.50,
    source: 'quote-builder-wizard',
  },
  {
    quoteId: quoteId(),
    Name: 'Priya Patel',
    Email: 'priya.patel+test@example.com',
    Phone: '616-555-0299',
    ZIP: '49503',
    followUpPref: 'email',
    installPlan: 'undecided',
    shippingAddress: {
      line1: '215 Monroe Ave NW',
      city: 'Grand Rapids',
      state: 'MI',
      zip: '49503',
    },
    zones: [
      {
        zoneId: 'back',
        zoneName: 'Backyard',
        style: 'horizon',
        grade: 'residential',
        height: '54',
        color: 'gloss-white',
        linearFootage: 160,
        corners: 4,
        gateCount: 1,
        items: [
          { sku: 'UAF-200', qty: 27, unit: 'panel', desc: 'Horizon 54" 3-Rail', price: 186.50, total: 5035.50 },
          { sku: 'UAF-200W', qty: 1, unit: 'gate', desc: "48\" Walk Gate", price: 482.25, total: 482.25 },
          { sku: 'POST-2x2-080', qty: 28, unit: 'post', desc: '2" Residential Post', price: 58.50, total: 1638.00 },
        ],
        subtotal: 7155.75,
      },
      {
        zoneId: 'front',
        zoneName: 'Front Yard',
        style: 'horizon',
        grade: 'residential',
        height: '48',
        color: 'gloss-white',
        linearFootage: 120,
        corners: 3,
        gateCount: 0,
        items: [
          { sku: 'UAF-200', qty: 20, unit: 'panel', desc: 'Horizon 48" 3-Rail', price: 168.00, total: 3360.00 },
          { sku: 'POST-2x2-080', qty: 21, unit: 'post', desc: '2" Residential Post', price: 58.50, total: 1228.50 },
        ],
        subtotal: 4588.50,
      },
      {
        zoneId: 'gate',
        zoneName: 'Driveway Gate',
        style: 'horizon',
        grade: 'residential',
        height: '60',
        color: 'gloss-white',
        linearFootage: 0,
        corners: 0,
        gateCount: 1,
        items: [
          { sku: 'UAF-200D', qty: 1, unit: 'gate', desc: "Horizon 10' Double Drive Gate, 60\" high", price: 2495.00, total: 2495.00 },
          { sku: 'ULTRA-HINGE', qty: 2, unit: 'pair', desc: 'Ultra Adjustable Hinge', price: 290.00, total: 580.00 },
          { sku: 'DROP-ROD', qty: 1, unit: 'ea', desc: 'Drop Rod w/ guides', price: 39.25, total: 39.25 },
        ],
        subtotal: 3114.25,
      },
    ],
    grandTotal: 14858.50,
    source: 'quote-builder-wizard',
  },
  {
    quoteId: quoteId(),
    Name: 'Marcus Johnson',
    Email: 'marcus.j+test@example.com',
    Phone: '313-555-0188',
    ZIP: '48202',
    followUpPref: 'email',
    installPlan: 'contractor-bid',
    shippingAddress: {
      line1: '3424 Woodward Ave',
      city: 'Detroit',
      state: 'MI',
      zip: '48202',
    },
    zones: [
      {
        zoneId: 'gate',
        zoneName: 'Driveway Gate',
        style: 'vanguard',
        grade: 'residential',
        height: '72',
        color: 'gloss-bronze',
        linearFootage: 0,
        corners: 0,
        gateCount: 1,
        items: [
          { sku: 'UAF-250D', qty: 1, unit: 'gate', desc: "Vanguard 12' Double Drive Gate, 72\" high", price: 3250.00, total: 3250.00 },
          { sku: 'ULTRA-HINGE', qty: 2, unit: 'pair', desc: 'Ultra Adjustable Hinge', price: 290.00, total: 580.00 },
          { sku: 'LOKKLATCH-DLX', qty: 1, unit: 'ea', desc: 'LokkLatch Deluxe w/ EAK', price: 175.00, total: 175.00 },
        ],
        subtotal: 4005.00,
      },
    ],
    grandTotal: 4005.00,
    source: 'quote-builder-wizard',
  },
];

async function send(lead, i) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  const body = await res.text();
  let parsed = body;
  try { parsed = JSON.parse(body); } catch {}
  console.log(`[${i + 1}/${fakeLeads.length}] ${lead.Name} (${lead.quoteId}) → ${res.status}`);
  if (res.status >= 400) {
    console.log('   response:', parsed);
  } else if (parsed && parsed.lead) {
    console.log(`   row id: ${parsed.lead.id}, grandTotal: $${parsed.lead.grandTotal}`);
  }
  return res.status;
}

(async () => {
  console.log('Sending', fakeLeads.length, 'fake leads to', ENDPOINT);
  console.log('---');
  const statuses = [];
  for (let i = 0; i < fakeLeads.length; i++) {
    statuses.push(await send(fakeLeads[i], i));
  }
  console.log('---');
  const okCount = statuses.filter(s => s < 400).length;
  console.log(`Done. ${okCount}/${fakeLeads.length} succeeded.`);
  process.exit(okCount === fakeLeads.length ? 0 : 1);
})();
