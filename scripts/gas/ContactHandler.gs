// ============================================================================
// ContactHandler.gs — Google Apps Script Web App
// Handles contact form + quote submissions from Grandview Design Studio.
//
// Deployment: Deploy as Web App
//   Execute as: Me (the Google account owner)
//   Who has access: Anyone
//
// Expects Script Property: GAS_SHEET_ID (Google Sheet ID)
// Set via: Project Settings → Script Properties → Add
//
// Endpoints (same URL, routed by source field in POST body):
//   source: "design-studio-contact" → handleContact()
//   source: "design-studio-quote"   → handleQuote()
// ============================================================================

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var source = body.source || '';

    var response;
    if (source === 'design-studio-quote') {
      response = handleQuote(body);
    } else {
      response = handleContact(body);
    }

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET for health check
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Grandview Fence — Quote Handler' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// handleContact — general inquiries from the ContactPopup
// ---------------------------------------------------------------------------
function handleContact(body) {
  var ss = getOrCreateSheet();
  var tab = getOrCreateTab(ss, 'Contacts');

  // Ensure headers exist
  if (tab.getLastRow() === 0) {
    tab.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Message', 'Source', 'Page URL']);
    tab.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  var timestamp = body.timestamp || new Date().toISOString();
  tab.appendRow([
    timestamp,
    body.name || '',
    body.email || '',
    body.phone || '',
    body.message || '',
    body.source || 'design-studio-contact',
    body.pageUrl || ''
  ]);

  // Send email notification
  var subject = 'Design Studio Contact — ' + (body.name || 'Unknown');
  var emailBody = [
    'Name: ' + (body.name || ''),
    'Email: ' + (body.email || ''),
    'Phone: ' + (body.phone || ''),
    '',
    'Message:',
    body.message || '',
    '',
    '---',
    'Source: ' + (body.source || ''),
    'Page: ' + (body.pageUrl || ''),
    'Time: ' + timestamp
  ].join('\n');

  MailApp.sendEmail({
    to: 'sales@grandviewfence.com',
    subject: subject,
    body: emailBody,
    replyTo: body.email || ''
  });

  return { status: 'ok' };
}

// ---------------------------------------------------------------------------
// handleQuote — quote submissions with full itemized data
// ---------------------------------------------------------------------------
function handleQuote(body) {
  var ss = getOrCreateSheet();
  var tab = getOrCreateTab(ss, 'Quotes');

  // Ensure headers exist
  if (tab.getLastRow() === 0) {
    tab.appendRow([
      'Timestamp', 'Quote Ref', 'Name', 'Email', 'Phone',
      'Style', 'Height', 'Grade', 'Linear Feet', 'Subtotal',
      'Gate Count', 'Terrain', 'Source', 'Page URL'
    ]);
    tab.getRange(1, 1, 1, 14).setFontWeight('bold');
  }

  var timestamp = body.timestamp || new Date().toISOString();
  var quoteRef = body.quoteRef || ('GV-' + Math.random().toString(36).substr(2, 6).toUpperCase());

  tab.appendRow([
    timestamp,
    quoteRef,
    body.name || '',
    body.email || '',
    body.phone || '',
    body.style || '',
    body.height || '',
    body.grade || '',
    body.linearFeet || '',
    body.subtotal || '',
    body.gateCount || 0,
    body.terrain || 'flat',
    body.source || 'design-studio-quote',
    body.pageUrl || ''
  ]);

  // Build itemized email body
  var lines = [
    'NEW QUOTE REQUEST',
    '=================',
    '',
    'Reference: ' + quoteRef,
    'Name: ' + (body.name || ''),
    'Email: ' + (body.email || ''),
    'Phone: ' + (body.phone || ''),
    '',
    'PROJECT SUMMARY',
    '---------------',
    'Style: ' + (body.style || ''),
    'Height: ' + (body.height || '') + '"',
    'Grade: ' + (body.grade || ''),
    'Linear Feet: ' + (body.linearFeet || ''),
    'Gates: ' + (body.gateCount || 0),
    'Terrain: ' + (body.terrain || 'flat'),
    ''
  ];

  // Itemized line items
  if (body.items && body.items.length > 0) {
    lines.push('ITEMIZED ESTIMATE');
    lines.push('-----------------');
    body.items.forEach(function(item) {
      var line = item.label + ': ' + item.qty + ' x $' + (item.unitPrice || 0).toFixed(2) + ' = $' + (item.total || 0).toFixed(2);
      lines.push(line);
      if (item.note) lines.push('  ' + item.note);
    });
    lines.push('');
    lines.push('SUBTOTAL: $' + (body.subtotal || 0).toFixed(2));
  }

  lines.push('');
  lines.push('---');
  lines.push('Source: ' + (body.source || ''));
  lines.push('Page: ' + (body.pageUrl || ''));
  lines.push('Time: ' + timestamp);

  var subject = 'New Quote — ' + quoteRef + ' — $' + (body.subtotal || 0).toFixed(2) + ' — ' + (body.name || 'Unknown');

  MailApp.sendEmail({
    to: 'sales@grandviewfence.com',
    subject: subject,
    body: lines.join('\n'),
    replyTo: body.email || ''
  });

  return { status: 'ok', quoteRef: quoteRef };
}

// ---------------------------------------------------------------------------
// Helper: get or create the Google Sheet
// ---------------------------------------------------------------------------
function getOrCreateSheet() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('GAS_SHEET_ID');
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  // If no sheet ID configured, create a new sheet
  var ss = SpreadsheetApp.create('Grandview Fence — Leads');
  PropertiesService.getScriptProperties().setProperty('GAS_SHEET_ID', ss.getId());
  Logger.log('Created new sheet: ' + ss.getUrl());
  return ss;
}

// ---------------------------------------------------------------------------
// Helper: get or create a tab by name
// ---------------------------------------------------------------------------
function getOrCreateTab(ss, tabName) {
  var tab = ss.getSheetByName(tabName);
  if (!tab) {
    tab = ss.insertSheet(tabName);
  }
  return tab;
}
