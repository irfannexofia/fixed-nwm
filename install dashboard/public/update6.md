# Prompt for TRAE AI: Add a Team To-Do List Component to Google Ads Dashboard

## 🎯 Objective

Extend the existing Google Ads dashboard at `/google-ads` by adding a new, interactive "Team To-Do List" component. This component will be placed directly below the existing campaign table and will allow users to view, add, and mark tasks as complete.

---

## 📝 Context & Target File

The task is to modify the `src/pages/GoogleAdsPage.js` file, which currently contains the KPI cards, performance chart, and campaign table. We will be adding a new section to this existing layout without altering the current components. The focus is on front-end functionality using React state.

---

## ✨ Requirements & Specifications

### 1. Mock Data for Tasks

First, create a new set of mock data for the to-do list items. This data should be managed by a `useState` hook. Create an array of task objects, where each object has the following structure:

```javascript
{
  id: 1,
  text: 'Riset kata kunci baru untuk Kampanye Brand Awareness',
  completed: false,
  assignee: 'Alice',
  dueDate: '2025-10-10'
}
```
Create at least 3-4 sample tasks with varying `completed` statuses.

### 2. UI Component Structure

* Render a new container section below the campaign table with a title `<h2>` that reads **"Daftar Tugas Tim (To-Do List)"**.
* **Input Form**: Above the list, create a form with:
    * An `<input type="text">` field with a placeholder like "Tulis tugas baru...".
    * A `<button>` labeled **"Tambah Tugas"**.
* **Task List**:
    * Render the list of tasks by mapping over the state array.
    * Each task item should be a flex container displaying:
        1.  An `<input type="checkbox">`, whose `checked` status is bound to the task's `completed` property.
        2.  A `<span>` or `<p>` element for the task `text`. Apply a `line-through` style if the task is completed.
        3.  A small `div` or `span` to represent the **Assignee**. You can just display the initial for now (e.g., "A" for "Alice").
        4.  A `span` to show the **Due Date**.
* **Filter Buttons**: Add two simple buttons or tabs above the list: "Aktif" and "Selesai" to filter the displayed tasks.

### 3. Functionality (React State Logic)

* **Adding Tasks**:
    * Create a state to hold the value of the new task input field.
    * The "Tambah Tugas" button's `onClick` handler should create a new task object and add it to the main tasks state array. The input field should be cleared after submission.
* **Toggling Completion**:
    * The `onChange` handler for each task's checkbox should toggle the `completed` status for that specific task in the state. The UI must re-render to show the change (e.g., the line-through style).
* **Filtering**:
    * Create a state to manage the current filter (e.g., 'active' or 'completed').
    * The list of tasks displayed should be a filtered version of the main tasks array based on the active filter.

### 4. Styling (CSS)

* Append new styles to the `src/pages/GoogleAdsPage.css` file.
* Style the new to-do list section to be consistent with the rest of the dashboard (using similar padding, borders, and fonts).
* Style the task items to be clean and readable, with proper alignment and spacing between the checkbox, text, assignee, and due date.
* Add a distinct style for completed tasks (e.g., grayed-out text and a line-through).
* Style the filter buttons to indicate which one is currently active.

---

## 💻 Expected Output

Provide the two updated code blocks:
1.  The full code for `src/pages/GoogleAdsPage.js`, now including both the original dashboard and the new to-do list component with all its logic.
2.  The appended CSS styles for `src/pages/GoogleAdsPage.css` required for the new to-do list component.