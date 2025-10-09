<script>
  import './KanbanBoard.css';
  import { onMount, onDestroy } from 'svelte';

  export let title = 'Work Management';
  export let subtitle = 'Track tasks across your team and projects';
  export let compact = false; // tampilkan versi lebih kecil jika true
  export let boardSlug = 'work'; // identitas board untuk Neon API

  const nowIso = () => new Date().toISOString();
  let dialogOpen = false;
  let editing = null; // task being edited

  const statuses = [
    { id: 'backlog', label: 'Brief' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ];

  let tasks = [];

  async function loadTasks() {
    try {
      const res = await fetch(`/api/kanban/${boardSlug}/tasks`);
      const data = await res.json();
      const rows = (data?.tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        status: t.status,
        priority: t.priority ?? 'medium',
        dueDate: t.due_date ?? '',
        assignee: t.assignee ?? '',
        tags: Array.isArray(t.tags) ? t.tags : [],
        createdAt: t.created_at ?? nowIso(),
        updatedAt: t.updated_at ?? nowIso(),
      }));
      tasks = rows;
    } catch (e) {
      console.error('Failed to load kanban tasks', e);
    }
  }
  onMount(loadTasks);

  // Draft for modal
  let draft = {
    id: null,
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    dueDate: '',
    assignee: '',
    tags: '',
  };

  function openCreate(initStatus = 'backlog') {
    editing = null;
    draft = { id: null, title: '', description: '', status: initStatus, priority: 'medium', dueDate: '', assignee: '', tags: '' };
    dialogOpen = true;
  }
  function openEdit(t) {
    editing = t;
    draft = { id: t.id, title: t.title, description: t.description ?? '', status: t.status, priority: t.priority ?? 'medium', dueDate: t.dueDate ?? '', assignee: t.assignee ?? '', tags: (t.tags ?? []).join(', ') };
    dialogOpen = true;
  }
  async function saveDraft() {
    if (!draft.title.trim()) return;
    try {
      if (editing) {
        const payload = {
          title: draft.title,
          description: draft.description || null,
          status: draft.status,
          priority: draft.priority,
          due_date: draft.dueDate || null,
          assignee: draft.assignee || null,
          tags: parseTags(draft.tags),
        };
        await fetch(`/api/kanban/tasks/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        tasks = tasks.map((t) => (t.id === editing.id ? { ...t, ...draft, tags: parseTags(draft.tags), updatedAt: nowIso() } : t));
      } else {
        const payload = {
          title: draft.title,
          description: draft.description || null,
          status: draft.status,
          priority: draft.priority,
          due_date: draft.dueDate || null,
          assignee: draft.assignee || null,
          tags: parseTags(draft.tags),
        };
        const res = await fetch(`/api/kanban/${boardSlug}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        const id = data?.id || `${Date.now()}`;
        tasks = [
          { id, title: draft.title, description: draft.description, status: draft.status, priority: draft.priority, dueDate: draft.dueDate, assignee: draft.assignee, tags: parseTags(draft.tags), createdAt: nowIso(), updatedAt: nowIso() },
          ...tasks,
        ];
      }
    } catch (e) {
      console.error('Failed to save draft', e);
    } finally {
      dialogOpen = false;
    }
  }
  function parseTags(s) {
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
  async function deleteTask(id) {
    try {
      await fetch(`/api/kanban/tasks/${id}`, { method: 'DELETE' });
      tasks = tasks.filter((t) => t.id !== id);
    } catch (e) {
      console.error('Failed to delete task', e);
    }
  }

  // Context menu state for task actions (right-click)
  let menu = { open: false, x: 0, y: 0, task: null };
  function openMenu(event, task) {
    event.preventDefault();
    menu = { open: true, x: event.pageX, y: event.pageY, task };
  }
  function closeMenu() { menu = { open: false, x: 0, y: 0, task: null }; }
  function editFromMenu() { if (menu.task) { openEdit(menu.task); closeMenu(); } }
  function deleteFromMenu() { if (menu.task) { deleteTask(menu.task.id); closeMenu(); } }

  function prioClass(p) {
    const v = (p || '').toString().toLowerCase();
    if (v.includes('urgent')) return 'urgent';
    if (v.includes('high')) return 'high';
    if (v.includes('medium')) return 'medium';
    return 'low';
  }

  // Drag & drop state and handlers
  let draggingId = null;
  let overStatus = null;
  function onDragStart(e, task) {
    draggingId = task.id;
    try { e.dataTransfer && e.dataTransfer.setData('text/plain', String(task.id)); } catch {}
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() { draggingId = null; overStatus = null; }
  function onDragOver(e, status) { e.preventDefault(); overStatus = status; }
  async function onDrop(e, status) {
    e.preventDefault();
    let id = draggingId;
    if (!id && e.dataTransfer) {
      const d = e.dataTransfer.getData('text/plain');
      if (d) id = d;
    }
    if (!id) return;
    // Optimistic update
    tasks = tasks.map((t) => (t.id === id ? { ...t, status, updatedAt: nowIso() } : t));
    try {
      await fetch(`/api/kanban/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error('Failed to update status', e);
      // Reload from server on failure
      loadTasks();
    } finally {
      draggingId = null;
      overStatus = null;
    }
  }

  // SSE: auto-reload ketika ada perubahan dari klien lain
  let sse;
  function attachSse() {
    try {
      const channel = `kanban:${boardSlug || 'work'}`;
      sse = new EventSource(`/api/stream?channel=${encodeURIComponent(channel)}`);
      const reload = () => {
        // Pastikan mengambil data terbaru dari server
        loadTasks();
      };
      sse.addEventListener('kanban/create', reload);
      sse.addEventListener('kanban/update', reload);
      sse.addEventListener('kanban/delete', reload);
    } catch (e) {
      console.warn('SSE attach failed (kanban)', e);
    }
  }
  onMount(() => {
    loadTasks();
    attachSse();
  });
  onDestroy(() => {
    try { sse && sse.close(); } catch {}
  });
</script>

<div class="kb-board space-y-6" class:compact>
  <div class="kb-header" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
    <div>
      <h1 class="kb-title">{title}</h1>
      <p class="kb-subtitle">{subtitle}</p>
    </div>
    <div class="flex items-center gap-2">
      <button class="kb-button primary" on:click={() => openCreate()}>+ New Task</button>
    </div>
  </div>

  <div class="kb-columns">
    <div class="kb-column">
      <div class="kb-col-title">
        <span class="kb-label backlog">Brief</span>
        <button class="kb-button" on:click={() => openCreate('backlog')}>+ Add</button>
      </div>
      <div class="kb-drop {overStatus === 'backlog' ? 'over' : ''}" on:dragover={(e) => onDragOver(e, 'backlog')} on:drop={(e) => onDrop(e, 'backlog')}>Drop tasks here</div>
      {#each tasks.filter(t => t.status === 'backlog') as t (t.id)}
        <div class="kb-task" draggable="true" on:dragstart={(e) => onDragStart(e, t)} on:dragend={onDragEnd} on:contextmenu={(e) => openMenu(e, t)} on:dblclick={() => openEdit(t)}>
          <div class="kb-task-title"><span class={`kb-prio ${prioClass(t.priority)}`}></span><h4>{t.title}</h4></div>
          {#if t.description}<div class="meta">{t.description}</div>{/if}
        </div>
      {/each}
    </div>

    <div class="kb-column">
      <div class="kb-col-title">
        <span class="kb-label in_progress">In Progress</span>
        <button class="kb-button" on:click={() => openCreate('in_progress')}>+ Add</button>
      </div>
      <div class="kb-drop {overStatus === 'in_progress' ? 'over' : ''}" on:dragover={(e) => onDragOver(e, 'in_progress')} on:drop={(e) => onDrop(e, 'in_progress')}>Drop tasks here</div>
      {#each tasks.filter(t => t.status === 'in_progress') as t (t.id)}
        <div class="kb-task" draggable="true" on:dragstart={(e) => onDragStart(e, t)} on:dragend={onDragEnd} on:contextmenu={(e) => openMenu(e, t)} on:dblclick={() => openEdit(t)}>
          <div class="kb-task-title"><span class={`kb-prio ${prioClass(t.priority)}`}></span><h4>{t.title}</h4></div>
          {#if t.description}<div class="meta">{t.description}</div>{/if}
        </div>
      {/each}
    </div>

    <div class="kb-column">
      <div class="kb-col-title">
        <span class="kb-label review">Review</span>
        <button class="kb-button" on:click={() => openCreate('review')}>+ Add</button>
      </div>
      <div class="kb-drop {overStatus === 'review' ? 'over' : ''}" on:dragover={(e) => onDragOver(e, 'review')} on:drop={(e) => onDrop(e, 'review')}>Drop tasks here</div>
      {#each tasks.filter(t => t.status === 'review') as t (t.id)}
        <div class="kb-task" draggable="true" on:dragstart={(e) => onDragStart(e, t)} on:dragend={onDragEnd} on:contextmenu={(e) => openMenu(e, t)} on:dblclick={() => openEdit(t)}>
          <div class="kb-task-title"><span class={`kb-prio ${prioClass(t.priority)}`}></span><h4>{t.title}</h4></div>
          {#if t.description}<div class="meta">{t.description}</div>{/if}
        </div>
      {/each}
    </div>

    <div class="kb-column">
      <div class="kb-col-title">
        <span class="kb-label done">Done</span>
        <button class="kb-button" on:click={() => openCreate('done')}>+ Add</button>
      </div>
      <div class="kb-drop {overStatus === 'done' ? 'over' : ''}" on:dragover={(e) => onDragOver(e, 'done')} on:drop={(e) => onDrop(e, 'done')}>Drop tasks here</div>
      {#each tasks.filter(t => t.status === 'done') as t (t.id)}
        <div class="kb-task" draggable="true" on:dragstart={(e) => onDragStart(e, t)} on:dragend={onDragEnd} on:contextmenu={(e) => openMenu(e, t)} on:dblclick={() => openEdit(t)}>
          <div class="kb-task-title"><span class={`kb-prio ${prioClass(t.priority)}`}></span><h4>{t.title}</h4></div>
          {#if t.description}<div class="meta">{t.description}</div>{/if}
        </div>
      {/each}
    </div>
  </div>

  {#if dialogOpen}
    <div class="kb-modal-backdrop" role="dialog" aria-modal="true" aria-label={editing ? 'Edit Task' : 'New Task'}>
      <div class="kb-modal">
        <h3>{editing ? 'Edit Task' : 'New Task'}</h3>
        <div class="space-y-3">
          <label>Task title</label>
          <input class="kb-input" type="text" bind:value={draft.title} />

          <label>Description</label>
          <textarea class="kb-textarea" rows="4" bind:value={draft.description}></textarea>

          <div class="grid">
            <div>
              <label>Priority</label>
              <div class="kb-field-indicator">
                <span class={`kb-prio ${prioClass(draft.priority)}`}></span>
                <select class="kb-select" bind:value={draft.priority}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label>Status</label>
              <select class="kb-select" bind:value={draft.status}>
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div class="grid">
            <div>
              <label>Due Date</label>
              <input class="kb-input" type="date" bind:value={draft.dueDate} />
            </div>
            <div>
              <label>Assignee</label>
              <input class="kb-input" type="text" bind:value={draft.assignee} placeholder="Name" />
            </div>
          </div>

          <label>Tags</label>
          <input class="kb-input" type="text" bind:value={draft.tags} placeholder="e.g., frontend, API" />
          <div class="kb-tags">Pisahkan dengan koma</div>

          <div class="kb-footer">
            <button class="kb-button" on:click={() => (dialogOpen = false)}>Cancel</button>
            <button class="kb-button primary" on:click={saveDraft}>{editing ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if menu.open}
    <div class="kb-menu-backdrop" on:click={closeMenu}></div>
    <div class="kb-menu" style={`top:${menu.y}px;left:${menu.x}px`}>
      <div class="kb-menu-item" on:click={editFromMenu}>Edit</div>
      <div class="kb-menu-sep"></div>
      <div class="kb-menu-item" on:click={deleteFromMenu}>Delete</div>
    </div>
  {/if}
</div>