# Prompt for TRAE AI: Build and Implement a Custom Calendar Component

## 🎯 Objective

Replace the current Google Calendar connection UI on the `/calendar` page with a new, custom-built, fully functional calendar component. The new component should be created from scratch and handle its own state and logic for displaying months and dates.

---

## 📝 Context & Target File

The application is a React project. The target file is the component that renders the `/calendar` route, which is likely `src/pages/CalendarPage.js`. This file currently contains UI and logic for connecting to Google Calendar, which must be completely removed and replaced.

Here is the assumed current code for `src/pages/CalendarPage.js`:

```jsx
// src/pages/CalendarPage.js

import React from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// This is the component that needs to be completely replaced.
const GoogleCalendarConnect = () => {
  const login = useGoogleLogin({
    onSuccess: codeResponse => console.log(codeResponse),
    flow: 'auth-code',
  });

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-3xl font-bold mb-2">Calendar</h2>
      <p className="text-gray-500 mb-6">
        Hubungkan akun Google untuk mengakses Google Calendar.
      </p>
      <button
        onClick={() => login()}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
      >
        Hubungkan Google Calendar
      </button>
    </div>
  );
};

const CalendarPage = () => {
  // The Client ID here is just an example.
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleCalendarConnect />
    </GoogleOAuthProvider>
  );
};

export default CalendarPage;
```

---

## ✨ Requirements & Specifications

1.  **Remove Existing Code**: Completely clear out the content of `CalendarPage.js`. Remove all imports and logic related to `@react-oauth/google` and the existing UI. The file should be rewritten from scratch as a single calendar component.

2.  **State Management**: Use the `useState` hook to manage the currently displayed date. Initialize it to the current date: `const [currentDate, setCurrentDate] = useState(new Date());`.

3.  **UI Structure (JSX)**: The component must render the following structure:
    * A main container div with a class name like `calendar-container`.
    * A header section (`calendar-header`) containing:
        * A "Previous" button (`◄`) to go to the previous month.
        * An `<h2>` element to display the current month and year dynamically (e.g., "Oktober 2025").
        * A "Next" button (`►`) to go to the next month.
    * A grid for the days of the week (`days-of-week`) showing "Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab".
    * A main grid for the dates (`date-grid`) which will be populated dynamically.

4.  **Calendar Logic**:
    * Create the logic to generate the grid of dates for the `currentDate` from the state.
    * This logic must calculate:
        * The year and month from `currentDate`.
        * The first day of the month and which day of the week it falls on.
        * The total number of days in that month.
    * The logic should generate an array of `div` elements representing the calendar grid. This includes creating empty `div`s for days before the 1st of the month to correctly align the dates.

5.  **Functionality**:
    * The "Previous" button's `onClick` handler must update the `currentDate` state to the previous month.
    * The "Next" button's `onClick` handler must update the `currentDate` state to the next month.
    * The component must re-render correctly whenever the month is changed.

6.  **Styling (CSS)**:
    * Provide a complete block of CSS code for the calendar.
    * The styling should be modern, clean, and fit a professional dashboard aesthetic.
    * Create styles for `.calendar-container`, `.calendar-header`, `.days-of-week`, `.date-grid`, and the individual `.day-cell`.
    * Include a style for `.day-cell.empty` to visually differentiate empty cells.
    * Add a style for the current day (e.g., `.day-cell.today`) to highlight it with a different background or border color.

---

## 💻 Expected Output

Provide two complete code blocks:
1.  The full code for the new `src/pages/CalendarPage.js` component.
2.  The full CSS code that should be placed in a corresponding file like `src/pages/CalendarPage.css`. Make sure to include an `@import` statement for the CSS file in the JS file.