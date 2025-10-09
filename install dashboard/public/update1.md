# Prompt for TRAE AI: Add "Ads" Dropdown Menu to Sidebar Component

## 🎯 Objective

Modify the existing React sidebar component (`Sidebar.js`) to include a new top-level dropdown menu named **"Ads"**. This menu will contain two sub-menu items: **"Google Ads"** and **"Meta Ads"**.

---

## 📝 Context & Existing Code

The project is a workflow management dashboard built with **React**. The navigation is handled by a sidebar component. We will be using `react-router-dom` for navigation links and `react-icons` for icons.

Here is the current code for the target file: `src/components/Sidebar.js`.

```jsx
// src/components/Sidebar.js

import React from 'react';
import { NavLink } from 'react-router-dom';
import { HiOutlineViewBoards, HiOutlineCalendar } from 'react-icons/hi';

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">WorkFlow</h1>
      </div>
      <nav className="flex-grow p-2">
        <ul>
          <li>
            <NavLink
              to="/board"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`
              }
            >
              <HiOutlineViewBoards className="mr-3 h-6 w-6" />
              <span>Board</span>
            </NavLink>
          </li>
          <li className="mt-2">
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`
              }
            >
              <HiOutlineCalendar className="mr-3 h-6 w-6" />
              <span>Calendar</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
```

---

## ✨ Requirements & Specifications

1.  **Add a New Menu Item**: Introduce a new menu item called **"Ads"** right after the "Calendar" link.
2.  **Implement Dropdown Functionality**:
    * The "Ads" menu item should function as a **collapsible dropdown toggle**, not a direct link.
    * Use a React state (`useState`) hook, for example `const [isAdsMenuOpen, setAdsMenuOpen] = useState(false);`, to manage the open/closed state of the dropdown.
    * Clicking the "Ads" item should toggle this state.
3.  **Add Sub-Menu Items**:
    * Inside the dropdown, add two `NavLink` items: **"Google Ads"** and **"Meta Ads"**.
    * The "Google Ads" link should navigate to the route `/google-ads`.
    * The "Meta Ads" link should navigate to the route `/meta-ads`.
4.  **Incorporate Icons**:
    * Add a relevant icon for the main "Ads" menu. Please use `HiOutlineMegaphone` from `react-icons/hi2`.
    * Add an icon for "Google Ads". Please use `SiGoogleads` from `react-icons/si`.
    * Add an icon for "Meta Ads". Please use `SiMeta` from `react-icons/si`.
    * You will need to add these to the import statements.
5.  **Maintain Styling**:
    * The "Ads" toggle button and its sub-menu links must follow the **same visual styling** as the existing "Board" and "Calendar" links (padding, hover effects, active state styling, etc.).
    * Sub-menu items should be slightly indented to indicate they are children of the "Ads" menu. A left padding or margin would be appropriate (e.g., `pl-8`).
6.  **Conditional Rendering**: The sub-menu `<ul>` containing "Google Ads" and "Meta Ads" should only be rendered in the DOM when the `isAdsMenuOpen` state is `true`.

---

## 💻 Expected Output

Provide the **complete and updated code** for the `src/components/Sidebar.js` file that implements all the requirements listed above. Do not provide explanations outside of code comments.