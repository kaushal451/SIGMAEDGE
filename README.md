# ⚡ LeadHarvest – LinkedIn Sales Navigator Extractor

A Chrome Extension to extract prospect data from LinkedIn Sales Navigator into structured CSV/Excel files.

---

## 📦 Installation (Developer Mode)

Since this is a custom extension, install it manually:

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `linkedin-scraper-extension` folder
5. The LeadHarvest icon will appear in your Chrome toolbar ✅

---

## 🚀 How to Use

1. Go to **LinkedIn Sales Navigator** → run your search with filters applied
2. Click the **LeadHarvest** icon in the Chrome toolbar
3. On the **Extract** tab:
   - Choose which **fields** to extract (Name, Title, Company, Location, etc.)
   - Set **KRA classification**: Tech Only / Marketing Only / Both
   - Set **page range** (e.g. pages 1–10)
4. Click **⚡ START EXTRACTION**
5. The extension will auto-scroll and paginate
6. Go to the **Leads** tab to view extracted contacts
7. Click **⬇️ EXPORT TO EXCEL** to download as CSV

---

## 📋 Fields Extracted

| Field | Description |
|-------|-------------|
| Full Name | Prospect's full name |
| Job Title | Current job title |
| Job Description | Brief job summary |
| Company Name | Employer name |
| Company Size | Employee count range |
| Industry | Company industry |
| City | City of location |
| State | State/Region |
| LinkedIn URL | Profile URL |
| KRA | Tech / Marketing / Both / Other |
| Extracted Date | Timestamp |

---

## ⚙️ Settings

- **Scroll Delay**: Time between page actions (1–5 seconds). Higher = safer, less likely to trigger rate limits
- **Auto Next Page**: Automatically click to next page
- **Deduplicate**: Skip profiles already in your leads list
- **Auto-classify KRA**: Automatically tag leads as Technology or Marketing based on job title keywords

---

## ⚠️ Important Notes

- This tool assists with **manual data collection workflows** on Sales Navigator
- Use responsibly and in accordance with LinkedIn's Terms of Service
- Add delays (3–5s recommended) to avoid triggering rate limits
- All data is stored **locally** in your browser — nothing is sent externally
- For best results, wait for each page to fully load before extraction

---

## 🗂 File Structure

```
linkedin-scraper-extension/
├── manifest.json       # Extension config
├── popup.html          # Extension UI
├── popup.js            # UI logic & data management
├── content.js          # Page scraping logic
├── background.js       # Service worker
├── icons/              # Extension icons (add your own)
└── README.md           # This file
```

---

## 📁 Adding Icons

Place PNG icons in the `icons/` folder:
- `icon16.png` (16×16)
- `icon32.png` (32×32)
- `icon48.png` (48×48)
- `icon128.png` (128×128)


