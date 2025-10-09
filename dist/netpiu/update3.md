# Prompt for TRAE AI: Implement Google Calendar Authentication UI

## 🎯 Objective

Modify the calendar page component located at `/calendar` to implement the user-facing part of the Google OAuth 2.0 authentication flow. The goal is to allow a user to initiate the login process and for the application to handle the response from Google securely.

**Security Note:** The implementation must not expose the `Client Secret`. The frontend's only role is to obtain an `authorization code` and send it to the backend.

---

## 📝 Context & Existing Code

The application is a React project using `react-router-dom` for routing. The calendar page is currently a simple placeholder. We will use the modern `@react-oauth/google` library to handle the client-side authentication flow.

Client ID `341471714404-q2km46ek51ftpct60c8mgr4ktl2ulcoj.apps.googleusercontent.com`

Client Secret `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`

Here is the likely current code for the target file: `src/pages/CalendarPage.js`.

```jsx
// src/pages/CalendarPage.js

import React from 'react';

const CalendarPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-3xl font-bold mb-2">Calendar</h2>
      <p className="text-gray-500">
        Placeholder calendar view. Ask me to integrate a real calendar and
        scheduling next.
      </p>
    </div>
  );
};

export default CalendarPage;
```

---

## ✨ Requirements & Specifications

1.  **Install Necessary Library**: The project needs the `@react-oauth/google` library. Add this to your dependencies.

2.  **Wrap Application with Provider**: The root of the application (likely `src/index.js` or `src/App.js`) must be wrapped with the `GoogleOAuthProvider`. Instruct me to do this and use an environment variable for the Client ID.
    * The `clientId` prop should be set to `process.env.REACT_APP_GOOGLE_CLIENT_ID`.

3.  **Modify `CalendarPage.js`**:
    * **State Management**: Add a state to track the authentication status, for example: `const [isAuthenticated, setIsAuthenticated] = useState(false);`.
    * **Conditional UI**:
        * If `isAuthenticated` is `false`, display a welcome message and a button to initiate the Google login flow. The button should say **"Hubungkan Google Calendar"**.
        * If `isAuthenticated` is `true`, display a simple message like **"Google Calendar Terhubung. Menampilkan Kalender..."**. (We will add the actual calendar UI in a later step).
    * **Implement Login Flow**:
        * Use the `useGoogleLogin` hook from `@react-oauth/google`.
        * Configure the hook with the following parameters:
            * `onSuccess`: This callback function will receive a `codeResponse` object from Google. Inside this function, you should immediately send the `codeResponse.code` value to your backend via a `POST` request to an endpoint like `/api/auth/google/callback`. For now, you can just `console.log` the code and set `setIsAuthenticated(true)`.
            * `flow`: Set this to `'auth-code'`. This is the correct, secure flow for web applications with a backend.
            * `scope`: Request access to the calendar API. The value should be `'https://www.googleapis.com/auth/calendar.events'`.
    * **Trigger Login**: The "Hubungkan Google Calendar" button's `onClick` handler should call the login function provided by the `useGoogleLogin` hook.

---

## 💻 Expected Output

1.  Provide the complete, updated code for `src/pages/CalendarPage.js`.
2.  Show how to wrap the main `App` component in `src/App.js` with the `GoogleOAuthProvider`.
3.  Include instructions on how to create and use the `.env` file for the `REACT_APP_GOOGLE_CLIENT_ID`.

The final code should be secure, functional, and ready for the next step of fetching and displaying calendar data from the backend.