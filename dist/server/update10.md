# Prompt for TRAE AI: Create and Implement a Reusable Kanban Board Component

## 🎯 Objective

Refactor the existing Kanban-style board from the "Work Management" page into a reusable React component named `KanbanBoard`. Then, implement this new component on three separate pages: `Board`, `UGC (Video)`, and `Design (Graphic)`, each with its own title and subtitle.

---

## 📝 Context & Target Files

The project has an existing, functional Kanban board on the `Board` page. We need to abstract this functionality to be used elsewhere.

* **Source File**: `src/pages/BoardPage.js` (contains the original Kanban code).
* **Target Files**:
    * `src/pages/UgcPage.js` (currently a placeholder).
    * `src/pages/DesignPage.js` (currently a placeholder).
* **New Component File to Create**: `src/components/KanbanBoard.js`.
* **New CSS File to Create**: `src/components/KanbanBoard.css`.

---

## ✨ Requirements & Specifications

### ### Part 1: Create the Reusable `KanbanBoard` Component

1.  **New Library**: This component will require drag-and-drop functionality. Specify the installation command for `react-beautiful-dnd`:
    ```bash
    npm install react-beautiful-dnd
    ```

2.  **Create New Component File**: Create `src/components/KanbanBoard.js`.

3.  **Move & Refactor Logic**:
    * Move all the JSX and logic for the Kanban board from `src/pages/BoardPage.js` into the new `KanbanBoard.js` file.
    * The new component should be generic. It must accept two props: `title` and `subtitle`.

4.  **Implement Drag-and-Drop**:
    * Integrate `react-beautiful-dnd` to manage moving tasks between columns.
    * Wrap the entire board in `<DragDropContext>`.
    * Wrap each column's task list in `<Droppable>`.
    * Wrap each task card in `<Draggable>`.
    * Implement the `onDragEnd` function to handle the state update logic when a user finishes dragging a card.

5.  **State Management & Mock Data**:
    * The component should manage its own state for columns and tasks. For now, use a structured set of mock data. The data should have columns like "Backlog", "In Progress", "Review", and "Done", each containing a list of task cards.

6.  **Styling**:
    * Create a new CSS file `src/components/KanbanBoard.css`.
    * Move all relevant CSS for the Kanban board, columns, and cards from any existing CSS file into this new, dedicated file.
    * Ensure the `KanbanBoard.js` component imports this CSS file.

### ### Part 2: Implement the Reusable Component on All Pages

1.  **Update `src/pages/BoardPage.js`**:
    * Remove all the old Kanban logic and JSX.
    * Replace it with a single instance of the new component, passing the appropriate props:
        ```jsx
        <KanbanBoard 
          title="Work Management" 
          subtitle="Track tasks across your team and projects" 
        />
        ```

2.  **Update `src/pages/UgcPage.js`**:
    * Replace the placeholder content with an instance of the new component:
        ```jsx
        <KanbanBoard 
          title="UGC (Video)" 
          subtitle="Plan and manage user-generated video content" 
        />
        ```

3.  **Update `src/pages/DesignPage.js`**:
    * Replace the placeholder content with an instance of the new component:
        ```jsx
        <KanbanBoard 
          title="Design (Graphic)" 
          subtitle="Manage all graphic design tasks from ideation to completion" 
        />
        ```

---

## 💻 Expected Output

1.  The complete code for the new reusable component: `src/components/KanbanBoard.js`.
2.  The complete code for its dedicated stylesheet: `src/components/KanbanBoard.css`.
3.  The simplified, updated code for all three pages that will now use this component: `BoardPage.js`, `UgcPage.js`, and `DesignPage.js`.
4.  A note at the top listing the necessary `npm install` command.