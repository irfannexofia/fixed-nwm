<script>
  import KanbanBoard from '../components/KanbanBoard.svelte';
  import TaskTable from '../components/TaskTable.svelte';
</script>

<div style="padding:20px">
  <KanbanBoard compact boardSlug="ugc" title="UGC (Video)" subtitle="Plan and manage user-generated video content" />
  <TaskTable storageKey="ugc_task_table" scope="ugc" />
  
</div>