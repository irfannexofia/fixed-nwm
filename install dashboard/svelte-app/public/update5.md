# Prompt for TRAE AI: Build Google Ads Management Dashboard UI

## 🎯 Objective

Transform the blank Google Ads page at `/google-ads` into a comprehensive and functional dashboard UI. The new interface should include KPI summary cards, a performance chart, a detailed campaign table, and primary action buttons. The implementation should use realistic mock data to simulate a live environment.

---

## 📝 Context & Target File

The application is a React-based workflow management tool. The target file for this task is the component responsible for rendering the `/google-ads` route, which we will assume is `src/pages/GoogleAdsPage.js`.

Here is the current placeholder code for `src/pages/GoogleAdsPage.js`:

```jsx
// src/pages/GoogleAdsPage.js

import React from 'react';

const GoogleAdsPage = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Google Ads</h1>
      <p className="text-gray-500 mt-2">
        Manage and monitor Google Ads campaigns here.
      </p>
    </div>
  );
};

export default GoogleAdsPage;
```

---

## ✨ Requirements & Specifications

### 1. New Libraries to Install

The project will require a charting library and an icon library. Please specify the installation commands for these:
* `react-chartjs-2` and `chart.js`
* `react-icons`

### 2. Mock Data

First, create a realistic set of mock data within the component file. This data will be used to populate the entire dashboard. Create an array of campaign objects, where each object has a structure like this:

```javascript
{
  id: 1,
  name: 'Kampanye Q4 - Penjualan Akhir Tahun',
  status: 'Active', // 'Active', 'Paused', 'Ended'
  clicks: 1250,
  impressions: 85000,
  cost: 5500000, // in IDR
  conversions: 85,
}
```
Create at least 3-4 different campaign objects in an array.

### 3. UI Component Breakdown

The page should be structured with the following components, built from top to bottom.

#### A. Header Section
* Keep the main title "Google Ads".
* Add a primary action button in the top right corner labeled **"+ Hubungkan Kampanye"**.
* Below the title, add a dropdown for a **Date Range Filter** (UI only, no functionality needed). Options should include "7 Hari Terakhir", "30 Hari Terakhir", "Bulan Ini".

#### B. Summary Dashboard (KPI Cards)
* Create a responsive flex container to hold several summary cards.
* Each card should display a title, a large value, and an icon.
* Implement the following cards using the mock data:
    1.  **Total Biaya**: Sum of `cost` from all campaigns.
    2.  **Total Klik**: Sum of `clicks`.
    3.  **CTR (Click-Through Rate)**: Calculated as `(total clicks / total impressions) * 100`.
    4.  **Total Konversi**: Sum of `conversions`.

#### C. Performance Chart
* Use `react-chartjs-2` to implement a **Line Chart**.
* The chart should visualize a trend over the last 7 days.
* Use static, sample data for the chart labels (e.g., day names) and datasets (e.g., Clicks or Conversions).
* The chart should be visually appealing, with a grid, tooltips, and a legend.

#### D. Campaign List Table
* Create a detailed and responsive table to display the mock campaign data.
* The table header must include the following columns: **NAMA KAMPANYE**, **STATUS**, **KLIK**, **IMPRESI**, **BIAYA (IDR)**, **KONVERSI**, and **AKSI**.
* In the **STATUS** column, display the text and a colored dot for visual indication (e.g., green for `Active`, yellow for `Paused`, red for `Ended`).
* In the **BIAYA** column, format the number as Indonesian Rupiah (e.g., "Rp 5.500.000").
* In the **AKSI** column, add three icon buttons from `react-icons` for each row:
    * `FiEye` (View Details)
    * `FiPause` (Pause Campaign)
    * `FiExternalLink` (View on Google Ads)

### 4. Styling (CSS)

* Provide a complete block of CSS to be placed in a corresponding file, `src/pages/GoogleAdsPage.css`.
* The styling must be modern, clean, and consistent with a professional dashboard.
* Use a consistent color palette (e.g., shades of gray for text, a primary color like blue or purple for interactive elements).
* Ensure the KPI cards, chart container, and table are well-structured with proper padding, borders, and shadows to create a clear visual hierarchy.
* The table should have hover effects on rows to improve user experience.

---

## 💻 Expected Output

Provide two complete code blocks:
1.  The full code for the new `src/pages/GoogleAdsPage.js`, including mock data, all UI components, and chart implementation.
2.  The full CSS code for `src/pages/GoogleAdsPage.css`.
3.  A note at the top listing the necessary `npm install` commands for the new libraries.