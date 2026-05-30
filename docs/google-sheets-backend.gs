/**
 * PHC AKKIRAMPURA PHARMACY DATA - Google Sheets Backend
 *
 * How to use:
 * 1. Open https://script.google.com
 * 2. Create New Project
 * 3. Paste this full code into Code.gs
 * 4. Click Run → setupPharmacySheet once and authorize
 * 5. Deploy → New deployment → Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Copy Web App URL and paste it in app Settings → Google Sheets backend sync.
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
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#0f766e')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
  return 'PharmacyData sheet created successfully.';
}

function doGet() {
  setupPharmacySheetIfMissing_();
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'PHC Akkirampura Pharmacy backend is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    setupPharmacySheetIfMissing_();
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const entry = body.entry || body;
    appendEntry_(entry);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupPharmacySheetIfMissing_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setupPharmacySheet();
    return;
  }
  const firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell !== HEADERS[0]) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0f766e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

function appendEntry_(entry) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.appendRow([
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
  ]);
}
