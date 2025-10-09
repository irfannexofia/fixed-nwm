# Prompt for TRAE AI: Extend Sidebar with New Menus

## 🎯 Objective

Modify the existing `Sidebar.js` component to add two new top-level menu items:
1.  A new sub-menu item under "Ads" called **"Completed Tasks"**.
2.  A new top-level dropdown menu named **"Content Planner"** with two sub-menu items: **"UGC (Video)"** and **"Design (Graphic)"**.

---

## 📝 Context & Existing Code

This request is a continuation of a previous modification. The current state of the sidebar already includes a dropdown menu for "Ads". We will now be extending this functionality.

Here is the current code for the target file: `src/components/Sidebar.js`.

```jsx
// src/components/Sidebar.js

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HiOutlineViewBoards, HiOutlineCalendar, HiOutlineMegaphone } from 'react-icons/hi2';
import { SiGoogleads, SiMeta } from 'react-icons/si';

const Sidebar = () => {
  const [isAdsMenuOpen, setAdsMenuOpen] = useState(false);

  return (
    <aside className="w-64 h-screen bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">WorkFlow</h1>
      </div>
      <nav className="flex-grow p-2">
        <ul>
          {/* Board */}
          <li>
            <NavLink to="/board" className={({ isActive }) => `flex items-center p-3 rounded-lg transition-colors ${ isActive ? 'bg-blue-600' : 'hover:bg-gray-700' }`}>
              <HiOutlineViewBoards className="mr-3 h-6 w-6" />
              <span>Board</span>
            </NavLink>
          </li>
          {/* Calendar */}
          <li className="mt-2">
            <NavLink to="/calendar" className={({ isActive }) => `flex items-center p-3 rounded-lg transition-colors ${ isActive ? 'bg-blue-600' : 'hover:bg-gray-700' }`}>
              <HiOutlineCalendar className="mr-3 h-6 w-6" />
              <span>Calendar</span>
            </NavLink>
          </li>
          {/* Ads Dropdown */}
          <li className="mt-2">
            <button onClick={() => setAdsMenuOpen(!isAdsMenuOpen)} className="w-full flex items-center p-3 rounded-lg transition-colors hover:bg-gray-700 text-left">
              <HiOutlineMegaphone className="mr-3 h-6 w-6" />
              <span>Ads</span>
              {/* Dropdown Arrow Icon can be added here */}
            </button>
            {isAdsMenuOpen && (
              <ul className="pl-8 mt-1">
                <li>
                  <NavLink to="/google-ads" className={({ isActive }) => `flex items-center p-2 rounded-lg transition-colors ${ isActive ? 'bg-blue-600' : 'hover:bg-gray-700' }`}>
                    <SiGoogleads className="mr-3 h-5 w-5" />
                    <span>Google Ads</span>
                  </NavLink>
                </li>
                <li className="mt-1">
                  <NavLink to="/meta-ads" className={({ isActive }) => `flex items-center p-2 rounded-lg transition-colors ${ isActive ? 'bg-blue-600' : 'hover:bg-gray-700' }`}>
                    <SiMeta className="mr-3 h-5 w-5" />
                    <span>Meta Ads</span>
                  </NavLink>
                </li>
              </ul>
            )}
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

### Part 1: Modify the "Ads" Menu

1.  **Add New Sub-Menu Item**:
    * Inside the "Ads" dropdown, add a new `NavLink` item named **"Completed Tasks"**.
    * This item should be placed after "Meta Ads".
    * It should navigate to the route `/ads/completed`.
    * Use the icon `HiOutlineCheckCircle` from `react-icons/hi2` for this link.

### Part 2: Add the "Content Planner" Menu

1.  **Create New Top-Level Menu**:
    * Add a new top-level dropdown menu named **"Content Planner"** after the entire "Ads" menu section.
    * This menu should also be a collapsible dropdown, similar to the "Ads" menu.
    * Create a new state to manage its open/closed status, for example: `const [isContentMenuOpen, setContentMenuOpen] = useState(false);`.
    * Use the icon `HiOutlinePencilAlt` from `react-icons/hi2` for this top-level menu.

2.  **Add Sub-Menu Items to Content Planner**:
    * Inside the "Content Planner" dropdown, add two `NavLink` items:
        1.  **"UGC (Video)"**: This should link to `/content/ugc`. Use the icon `HiOutlineVideoCamera` from `react-icons/hi2`.
        2.  **"Design (Graphic)"**: This should link to `/content/design`. Use the icon `HiOutlinePhotograph` from `react-icons/hi2`.
    * Ensure these sub-menu items are indented and styled consistently with the "Ads" sub-menu.

3.  **Import New Icons**:
    * Remember to add the new icons (`HiOutlineCheckCircle`, `HiOutlinePencilAlt`, `HiOutlineVideoCamera`, `HiOutlinePhotograph`) to the import statements from `react-icons/hi2`.

4.  **Maintain Code Structure**:
    * Keep the JSX clean and readable. Use consistent spacing and class names.
    * The functionality and styling must be identical to the existing dropdown menu pattern.

---

## 💻 Expected Output

Provide the **complete and updated code** for the `src/components/Sidebar.js` file. The final code should include both the modified "Ads" menu and the new "Content Planner" menu, with all specified icons, links, and dropdown functionality. Do not provide explanations outside of code comments.