# Prompt for TRAE AI: Create a Google Ads Connection Modal

## 🎯 Objective

Enhance the user experience of the Google Ads integration by creating a modal window. This modal will appear when the "+ Hubungkan Kampanye" button is clicked, providing context to the user before they are redirected to Google for authentication.

---

## 📝 Context & Target File

The task is to modify the `src/pages/GoogleAdsPage.js` file. The current "+ Hubungkan Kampanye" button is likely an `<a>` tag that immediately redirects. This behavior needs to be changed to open a modal instead.

---

## ✨ Requirements & Specifications

### 1. State Management for Modal
* Introduce a new React state to manage the modal's visibility: `const [isModalOpen, setIsModalOpen] = useState(false);`.

### 2. Modify Button Behavior
* Change the "+ Hubungkan Kampanye" element from an `<a>` tag back to a `<button>`.
* The `onClick` handler for this button should now set the modal's visibility to true: `onClick={() => setIsModalOpen(true)}`.

### 3. Implement the Modal Component (JSX)
* Render the modal conditionally based on the `isModalOpen` state. When `true`, the modal should be displayed.
* The modal structure should include:
    * A semi-transparent backdrop (`<div className="modal-backdrop">`) that covers the entire page. Its `onClick` handler should close the modal.
    * A centered content box (`<div className="modal-content">`).
* The content box must contain:
    * A close button (`<button className="modal-close-btn">`) in the top-right corner with an "X" icon. Its `onClick` should close the modal.
    * An `<h2>` title: "Hubungkan Akun Google Ads Anda".
    * A `<p>` tag with an explanatory text.
    * A simple `<ul>` listing the permissions ("Melihat daftar kampanye", "Melihat metrik performa").
    * A prominent `<a>` tag styled as a primary button with the text "Login dengan Google". This link's `href` must point to the backend authentication URL: `http://localhost:3001/auth/googleads`.

### 4. Styling (CSS)
* Provide the necessary CSS to be added to `src/pages/GoogleAdsPage.css` to style the modal.
* The `.modal-backdrop` should be `position: fixed`, cover the whole screen (`top: 0; left: 0; ...`), have a `z-index`, and a semi-transparent black background (`background-color: rgba(0, 0, 0, 0.6);`).
* The `.modal-content` should be centered, have a white background, padding, rounded corners, and a `z-index` higher than the backdrop.
* Style the header, text, list, and buttons inside the modal for a clean and professional look.

---

## 💻 Expected Output

1.  The updated code for `src/pages/GoogleAdsPage.js`, including the new state, the modified button, and the conditionally rendered modal JSX.
2.  The new CSS styles for the modal component, to be added to `src/pages/GoogleAdsPage.css`.