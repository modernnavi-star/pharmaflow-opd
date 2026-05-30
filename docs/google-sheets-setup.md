# Google Sheets backend setup — two-way sync

The app already has this Web App URL embedded:

```txt
https://script.google.com/macros/s/AKfycbybJCQ9jLVQcxU7bxzByBO9lLdgPoDWDgaQefGwpfPcM1E2_E9qpKFmLbwPBcIzcA1Dig/exec
```

But the Google Apps Script project must use the latest backend code from `docs/google-sheets-backend.gs`.

## 1. Update / create Apps Script

1. Open <https://script.google.com>
2. Open your existing pharmacy backend project, or create **New project**
3. Delete the old `Code.gs` content
4. Copy all code from `docs/google-sheets-backend.gs`
5. Paste it into `Code.gs`
6. Save the project

## 2. Create / format the sheet

1. Select function `setupPharmacySheet`
2. Click **Run**
3. Authorize permissions

This creates or updates a sheet tab named:

```txt
PharmacyData
```

## 3. Deploy Web App

If this is a new project:

1. Click **Deploy** → **New deployment**
2. Select type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy**
6. Copy the Web App URL

If updating existing project:

1. Click **Deploy** → **Manage deployments**
2. Click edit pencil
3. Version: **New version**
4. Click **Deploy**

## 4. App setup

The provided URL is embedded by default. If you need to change it:

1. Open app
2. Go to **Useful links** → **Settings**
3. Paste Web App URL under **Google Sheets two-way backup sync**
4. Tap **Save URL**
5. Tap **Sync now** to pull sheet data into the app

## Important for two-way sync / Android

The latest backend supports **JSONP** for app-to-sheet restore, because Android WebView may block normal cross-origin JSON fetches from Google Apps Script.

After pasting the latest `docs/google-sheets-backend.gs`, you must redeploy:

```txt
Deploy → Manage deployments → Edit pencil → Version: New version → Deploy
```

If you do not redeploy a new version, **Sync now will not work**.

## Two-way sync behavior

### App → Google Sheet

Whenever a stock entry is saved in the app:

- It saves locally first
- Then it sends the entry to Google Sheets
- If the same Entry ID exists, the row is updated
- If it is new, a row is added

### Google Sheet → App

When the app starts, and when **Sync now** is tapped:

- It downloads all rows from Google Sheets using JSONP restore mode
- Merges them into local app data by Entry ID
- Rebuilds local current stock from closing stock

This helps restore data after accidental app data deletion or phone/app reinstall.

## Sheet columns

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
