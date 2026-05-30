# Google Sheets backend setup

This app can save stock entries to Google Sheets using a Google Apps Script Web App.

## 1. Create the Sheet backend

1. Open <https://script.google.com>
2. Click **New project**
3. Delete the default code in `Code.gs`
4. Copy all code from `docs/google-sheets-backend.gs` and paste it into `Code.gs`
5. Save the project as `PHC Akkirampura Pharmacy Backend`
6. Select function `setupPharmacySheet`
7. Click **Run** and authorize permissions

This creates a sheet tab named `PharmacyData` with formatted headers.

## 2. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Select type: **Web app**
3. Set **Execute as**: `Me`
4. Set **Who has access**: `Anyone`
5. Click **Deploy**
6. Copy the Web App URL. It looks like:

```txt
https://script.google.com/macros/s/AKfycb.../exec
```

## 3. Add URL in Android app

1. Open the app
2. Go to **Useful links** → **Settings**
3. Paste the Web App URL into **Google Sheets backend sync**
4. Tap **Save URL**

After this, new stock entries will save locally and sync to Google Sheets.

## Columns saved

- Synced At
- Entry ID
- Date
- Medicine ID
- Medicine Name
- Generic Name
- Strength
- Form
- Category
- Opening Stock
- Inward / Received
- Issued / Dispensed
- Closing Stock
- Batch No
- Expiry Date
- Received Pack Type
- Received Pack Qty
- Issue Pack Type
- Issue Pack Qty
- Notes
