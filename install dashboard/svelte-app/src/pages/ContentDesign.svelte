<script>
  import KanbanBoard from '../components/KanbanBoard.svelte';
  import TaskTable from '../components/TaskTable.svelte';
</script>

<div style="padding:20px">
  <KanbanBoard compact boardSlug="design" title="Design (Graphic)" subtitle="Manage all graphic design tasks from ideation to completion" />
  <TaskTable storageKey="design_task_table" scope="design" />
</div>