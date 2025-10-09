# Prompt for TRAE AI: Integrate Real Google Ads Data into Dashboard

## 🎯 Objective

Refactor the entire Google Ads feature to be fully dynamic by integrating with the live Google Ads API. This involves three major tasks:
1.  Implementing the backend OAuth2 flow to securely save user refresh tokens to our Neon database.
2.  Creating a new backend API endpoint to fetch real campaign data from the Google Ads API.
3.  Connecting the React frontend to this new backend endpoint to display the live data, removing all mock data.

---

## 📝 Context & Target Files

The project consists of a React frontend and a Node.js/Express backend connected to a Neon (PostgreSQL) database. The user has already created the `google_auth_tokens` table in the database.

**Target Files:**
1.  `server.js` (Backend)
2.  `src/pages/GoogleAdsPage.js` (Frontend)

**Current state of `server.js` (for context):**
It has a basic Express setup, a working connection pool to Neon, and API endpoints for the to-do list feature.

**Required `.env` variables for the backend:**
Ensure these variables are loaded using `dotenv`:
* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLIENT_SECRET`
* `GOOGLE_REDIRECT_URI` (should be `http://localhost:3001/auth/googleads/callback`)
* `GOOGLE_ADS_DEVELOPER_TOKEN`
* `GOOGLE_ADS_CUSTOMER_ID` (the 10-digit ID without hyphens)
* `DATABASE_URL`

---

## ✨ Requirements & Specifications

### ### Part 1: Backend Modifications (`server.js`)

#### A. Implement Full Authentication Flow
1.  **Create Authentication Endpoints**: Add two endpoints for the OAuth2 flow.
    * `GET /auth/googleads`: This endpoint should generate the Google authorization URL. It must request `offline` access to get a refresh token and include the `https://www.googleapis.com/auth/adwords` scope. It should then redirect the user to this URL.
2.  **Implement Callback Logic**:
    * Find or create the `GET /auth/googleads/callback` endpoint.
    * Inside this endpoint, use the `code` from the query parameter to exchange it for tokens using `googleapis`.
    * If a `refresh_token` is received, save it to the `google_auth_tokens` table in the Neon database. Use an `INSERT ... ON CONFLICT ... UPDATE` (UPSERT) query to handle both new and existing users. For now, you can hardcode the `user_id` to `1`.
    * After successfully saving the token, redirect the user back to the frontend dashboard at `http://localhost:3000/google-ads`.

#### B. Create the Data Endpoint
1.  **Define the Endpoint**: Create a new endpoint `GET /api/googleads/campaigns`.
2.  **Fetch Token from DB**: The first step inside this endpoint must be to query the `google_auth_tokens` table to retrieve the saved `refresh_token` for the user (again, assume `user_id = 1`). If no token is found, return a 401 Unauthorized error.
3.  **Initialize Google Ads API Client**: Use the `google-ads-api` library to create an API client instance. This instance must be configured with the `client_id`, `client_secret`, `developer_token`, and the `refresh_token` retrieved from the database.
4.  **Execute GAQL Query**: Use the API client to query the customer account specified in `GOOGLE_ADS_CUSTOMER_ID`. Execute the following Google Ads Query Language (GAQL) query to get the necessary data:
    ```sql
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id
    ```
5.  **Format and Respond**: Process the results from the API. Convert the `metrics.cost_micros` value to a standard currency format by dividing by 1,000,000. Send the formatted array of campaign objects as a JSON response.
6.  **Error Handling**: Wrap all database and API call logic in `try...catch` blocks to ensure the server doesn't crash and sends back meaningful error messages.

### ### Part 2: Frontend Modifications (`src/pages/GoogleAdsPage.js`)

1.  **Remove Mock Data**: Delete the entire static mock data array for campaigns.
2.  **Implement Data Fetching State**: Use `useState` hooks to manage `campaigns`, `isLoading`, and `error` states.
3.  **Fetch Data with `useEffect`**:
    * Create an asynchronous function inside a `useEffect` hook that runs when the component mounts.
    * This function should make a `fetch` call to the new backend endpoint: `http://localhost:3001/api/googleads/campaigns`.
    * Handle the response by updating the `campaigns` state with the data, or the `error` state if the fetch fails.
    * Set `isLoading` to `true` before the fetch and to `false` after it completes or fails.
4.  **Implement Conditional Rendering**:
    * If `isLoading` is `true`, display a loading message or spinner.
    * If `error` is not null, display the error message.
    * Otherwise, render the dashboard components (KPI cards, chart, table) using the data from the `campaigns` state.
5.  **Update the Action Button**:
    * Locate the "+ Hubungkan Kampanye" button.
    * This button must now trigger the authentication flow. The easiest way is to wrap it in an `<a>` tag pointing to the backend authentication endpoint: `<a href="http://localhost:3001/auth/googleads">`.

---

## 💻 Expected Output

1.  The complete, refactored code for `server.js` containing the full authentication logic and the new `/api/googleads/campaigns` data endpoint.
2.  The complete, refactored code for `src/pages/GoogleAdsPage.js` showing the removal of mock data and the implementation of the `useEffect` hook for live data fetching.