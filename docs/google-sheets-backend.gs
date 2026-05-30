/**
 * PHC AKKIRAMPURA PHARMACY DATA - Google Sheets Backend
 * Two-way sync version.
 *
 * How to use:
 * 1. Open https://script.google.com
 * 2. Create New Project or open your existing backend project
 * 3. Paste this full code into Code.gs
 * 4. Click Run → setupPharmacySheet once and authorize
 * 5. Deploy → Manage deployments → Edit → New version → Deploy
 * 6. Copy Web App URL into app Settings if needed.
 */

const SHEET_NAME = 'PharmacyData';
const HEADERS = [
  'Synced At',
  'Entry ID',
  'Date',
  'Medicine ID',
  'Medicine Name',
  'Generic Name',
  'Strength',
  'Form',
  'Category',
  'Opening Stock',
  'Inward / Received',
  'Issued / Dispensed',
  'Closing Stock',
  'Batch No',
  'Expiry Date',
  'Received Pack Type',
  'Received Pack Qty',
  'Issue Pack Type',
  'Issue Pack Qty',
  'Notes'
];

function setupPharmacySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#0f766e')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
  return 'PharmacyData sheet is ready.';
}

function doGet(e) {
  setupPharmacySheetIfMissing_();
  const mode = e && e.parameter && e.parameter.mode;
  const callback = e && e.parameter && e.parameter.callback;

  let payload;
  if (mode === 'entries') {
    payload = { ok: true, entries: getEntries_() };
  } else {
    payload = {
      ok: true,
      message: 'PHC Akkirampura Pharmacy backend is running',
      entries: getEntries_().length
    };
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(payload);
}

function doPost(e) {
  try {
    setupPharmacySheetIfMissing_();
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const entry = body.entry || body;

    if (!entry.id) {
      entry.id = Utilities.getUuid();
    }

    upsertEntry_(entry);
    return json_({ ok: true, id: entry.id });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function setupPharmacySheetIfMissing_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setupPharmacySheet();
    return;
  }
  if (sheet.getRange(1, 1).getValue() !== HEADERS[0]) {
    setupPharmacySheet();
  }
}

function upsertEntry_(entry) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const row = entryToRow_(entry);
  const rowIndex = findRowByEntryId_(entry.id);

  if (rowIndex > 1) {
    sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function findRowByEntryId_(entryId) {
  if (!entryId) return -1;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(entryId)) return i + 2;
  }
  return -1;
}

function entryToRow_(entry) {
  return [
    new Date(),
    entry.id || '',
    entry.entry_date || '',
    entry.medicine_id || '',
    entry.medicine_name || '',
    entry.generic_name || '',
    entry.strength || '',
    entry.form || '',
    entry.category || '',
    Number(entry.opening_stock || 0),
    Number(entry.received || 0),
    Number(entry.dispensed || 0),
    Number(entry.closing_stock || 0),
    entry.batch_no || '',
    entry.expiry_date || '',
    entry.received_pack_type || '',
    Number(entry.received_pack_qty || 0),
    entry.issue_pack_type || '',
    Number(entry.issue_pack_qty || 0),
    entry.notes || ''
  ];
}

function getEntries_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues()
    .filter(row => row[1] || row[4])
    .map(row => ({
      id: String(row[1] || Utilities.getUuid()),
      entry_date: formatDate_(row[2]),
      medicine_id: String(row[3] || ''),
      medicine_name: String(row[4] || ''),
      generic_name: row[5] ? String(row[5]) : null,
      strength: row[6] ? String(row[6]) : null,
      form: row[7] ? String(row[7]) : null,
      category: row[8] ? String(row[8]) : null,
      opening_stock: Number(row[9] || 0),
      received: Number(row[10] || 0),
      dispensed: Number(row[11] || 0),
      closing_stock: Number(row[12] || 0),
      batch_no: row[13] ? String(row[13]) : null,
      expiry_date: row[14] ? formatDate_(row[14]) : null,
      received_pack_type: String(row[15] || 'tablets'),
      received_pack_qty: Number(row[16] || 0),
      issue_pack_type: String(row[17] || 'tablets'),
      issue_pack_qty: Number(row[18] || 0),
      notes: row[19] ? String(row[19]) : null
    }));
}

function formatDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
