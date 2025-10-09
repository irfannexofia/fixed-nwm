<script lang="ts">
  import KanbanBoard from '$lib/install-dashboard/components/KanbanBoard.svelte';
  import TaskTable from '$lib/install-dashboard/components/TaskTable.svelte';
  // Board columns
  type Status = 'brief' | 'inprogress' | 'review' | 'done';
  type Task = { id: string; title: string; status: Status };
  const tasks = $state<Task[]>([]);
  const statusOrder: { key: Status; label: string; color?: string }[] = [
    { key: 'brief', label: 'Brief' },
    { key: 'inprogress', label: 'In Progress', color: 'text-blue-600' },
    { key: 'review', label: 'Review', color: 'text-amber-600' },
    { key: 'done', label: 'Done', color: 'text-emerald-600' }
  ];
  function addTask(s: Status) {
    const title = prompt('Task title');
    if (!title) return;
    tasks.push({ id: Math.random().toString(36).slice(2), title, status: s });
  }
  function filtered(s: Status) {
    return tasks.filter((t) => t.status === s);
  }

  // Sidebar navigation
  type ViewKey = 'board' | 'calendar' | 'ads_google' | 'ads_meta' | 'ads_completed' | 'ugc' | 'design';
  let current: ViewKey = 'board';
  const isActive = (v: ViewKey) => (current === v ? 'bg-primary text-white' : 'hover:bg-slate-50');
  import { onMount } from 'svelte';
  function setView(v: ViewKey) {
    current = v;
    if (typeof window !== 'undefined') window.location.hash = v;
  }
  onMount(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    const valid = ['board','calendar','ads_google','ads_meta','ads_completed','ugc','design'] as ViewKey[];
    if (hash && (valid as string[]).includes(hash)) current = hash as ViewKey;
    const handler = () => {
      const h = window.location.hash.replace('#', '');
      if ((valid as string[]).includes(h)) current = h as ViewKey;
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });

  // Calendar view state
  const weekdayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthLabels = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let calRef = new Date();
  function monthTitle(d: Date) {
    return `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
  }
  function firstCalendarCell(d: Date) {
    const s = new Date(d.getFullYear(), d.getMonth(), 1);
    const startOffset = s.getDay(); // 0=Sun
    return new Date(d.getFullYear(), d.getMonth(), 1 - startOffset);
  }
  function calendarCells(d: Date) {
    const start = firstCalendarCell(d);
    const cells = [] as { date: Date; inMonth: boolean }[];
    for (let i = 0; i < 42; i++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      cells.push({ date: day, inMonth: day.getMonth() === d.getMonth() });
    }
    return cells;
  }
  function prevMonth() {
    calRef = new Date(calRef.getFullYear(), calRef.getMonth() - 1, 1);
  }
  function nextMonth() {
    calRef = new Date(calRef.getFullYear(), calRef.getMonth() + 1, 1);
  }

  // Ads view (Google/Meta) simple metrics and chart placeholder
  let adsRange = '7 Hari Terakhir';
  const googleMetrics = $state({ biaya: 0, klik: 0, ctr: 0.0, konversi: 0 });
  const metaMetrics = $state({ biaya: 0, klik: 0, ctr: 0.0, konversi: 0 });

  // UGC view form + table
  let ugcForm = { task: '', url: '', caption: '', status: 'Draft' };
  const ugcRows = $state<{ task: string; url: string; caption: string; status: string }[]>([]);
  function addUgc() {
    if (!ugcForm.task) return;
    ugcRows.push({ ...ugcForm });
    ugcForm = { task: '', url: '', caption: '', status: 'Draft' };
  }

  // Design view form + table
  let designForm = { task: '', url: '', caption: '', status: 'Draft' };
  const designRows = $state<{ task: string; url: string; caption: string; status: string }[]>([]);
  function addDesign() {
    if (!designForm.task) return;
    designRows.push({ ...designForm });
    designForm = { task: '', url: '', caption: '', status: 'Draft' };
  }
</script>

<div class="min-h-screen bg-white">
  <!-- Layout wrapper -->
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-slate-200 bg-white flex flex-col">
      <div class="px-4 py-3 flex items-center gap-2">
        <img src="/netpiu.svg" alt="NetPiu" class="h-6 w-6" />
        <div>
          <p class="text-sm font-semibold">Work</p>
          <p class="text-xs text-slate-500">Management</p>
        </div>
      </div>
      <nav class="mt-2 flex-1 space-y-1 px-2">
        <a href="#board" class={`block w-full px-3 py-2 rounded-md ${isActive('board')}`} on:click|preventDefault={() => setView('board')}>
          <span class="inline-flex items-center gap-2 cursor-pointer"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/></svg> Board</span>
        </a>
        <a href="#calendar" class={`block w-full px-3 py-2 rounded-md ${isActive('calendar')}`} on:click|preventDefault={() => setView('calendar')}>
          <span class="inline-flex items-center gap-2 cursor-pointer"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v3H7zM15 2h2v3h-2zM3 6h18v15H3z"/></svg> Calendar</span>
        </a>
        <div class="mt-2">
          <p class="px-3 text-xs font-medium text-slate-500">Ads</p>
          <div class="mt-1 space-y-1">
            <a href="#ads_google" class={`block w-full px-3 py-2 rounded-md ${isActive('ads_google')}`} on:click|preventDefault={() => setView('ads_google')}>
              <span class="inline-flex items-center gap-2 cursor-pointer"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l4 8-8 12L4 14z"/></svg> Google Ads</span>
            </a>
            <a href="#ads_meta" class={`block w-full px-3 py-2 rounded-md ${isActive('ads_meta')}`} on:click|preventDefault={() => setView('ads_meta')}>
              <span class="inline-flex items-center gap-2 cursor-pointer"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z"/></svg> Meta Ads</span>
            </a>
            <a href="#ads_completed" class={`block w-full px-3 py-2 rounded-md ${isActive('ads_completed')}`} on:click|preventDefault={() => setView('ads_completed')}>
              <span class="inline-flex items-center gap-2 cursor-pointer"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16l-3-3 1.5-1.5L9 13l7.5-7.5L18 7z"/></svg> Completed Tasks</span>
            </a>
          </div>
        </div>
        <a href="#content_planner" class={`block w-full px-3 py-2 rounded-md hover:bg-slate-50`}>
          <span class="inline-flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v4H4zM4 10h10v4H4zM4 16h16v4H4z"/></svg> Content Planner</span>
        </a>
        <a href="#ugc" class={`block w-full px-3 py-2 rounded-md ${isActive('ugc')}`} on:click|preventDefault={() => setView('ugc')}>
          <span class="inline-flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v12H4zM8 19h8v2H8z"/></svg> UGC (Video)</span>
        </a>
        <a href="#design" class={`block w-full px-3 py-2 rounded-md ${isActive('design')}`} on:click|preventDefault={() => setView('design')}>
          <span class="inline-flex items-center gap-2"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4zM8 8h8v8H8z"/></svg> Design (Graphic)</span>
        </a>
      </nav>
      <div class="mt-auto p-4">
        <button class="btn-primary w-full inline-flex justify-center">+ New Project</button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1">
      <!-- Topbar -->
      <div class="border-b border-slate-200 bg-white">
        <div class="flex items-center gap-3 px-6 py-3">
          <div class="flex-1">
            <input class="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Search tasks, projects, people" />
          </div>
          <button class="btn bg-primary text-white">New Task</button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6">
        {#if current === 'board'}
          <KanbanBoard title="Work Management" subtitle="Track tasks across your team and projects" boardSlug="work" />
        {:else if current === 'calendar'}
          <h1 class="text-2xl font-semibold">Calendar</h1>
          <div class="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex items-center justify-between">
              <button class="btn bg-slate-100" on:click={prevMonth}>&lt;</button>
              <h3 class="text-xl font-semibold">{monthTitle(calRef)}</h3>
              <button class="btn bg-slate-100" on:click={nextMonth}>&gt;</button>
            </div>
            <div class="mt-4 grid grid-cols-7 gap-2 text-center text-sm text-slate-500">
              {#each weekdayLabels as w}<div class="py-2">{w}</div>{/each}
            </div>
            <div class="mt-2 grid grid-cols-7 gap-2">
              {#each calendarCells(calRef) as c}
                <div class={`rounded-lg p-3 text-center text-sm ${c.inMonth ? 'bg-white ring-1 ring-slate-200' : 'bg-slate-50 text-slate-400'}`}>{c.date.getDate()}</div>
              {/each}
            </div>
          </div>
        {:else if current === 'ads_google'}
          <h1 class="text-2xl font-semibold">Google Ads</h1>
          <div class="mt-3 flex items-center gap-3">
            <select bind:value={adsRange} class="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>7 Hari Terakhir</option>
              <option>30 Hari</option>
              <option>Semua</option>
            </select>
            <button class="btn bg-slate-100">Tugas Tim</button>
            <button class="btn bg-primary text-white">+ Hubungkan Kampanye</button>
          </div>
          <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">Total Biaya</p>
              <p class="mt-1 text-xl font-semibold">Rp {googleMetrics.biaya.toFixed(2)}</p>
            </div>
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">Total Klik</p>
              <p class="mt-1 text-xl font-semibold">{googleMetrics.klik}</p>
            </div>
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">CTR</p>
              <p class="mt-1 text-xl font-semibold">{(googleMetrics.ctr * 100).toFixed(2)}%</p>
            </div>
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">Total Konversi</p>
              <p class="mt-1 text-xl font-semibold">{googleMetrics.konversi}</p>
            </div>
          </div>
          <div class="mt-6 rounded-xl bg-white ring-1 ring-slate-200 p-4">
            <h4 class="text-sm font-medium text-slate-600">Clicks vs Conversions</h4>
            <svg viewBox="0 0 400 160" class="mt-3 h-40 w-full">
              <polyline points="10,130 60,120 110,100 160,110 210,90 260,100 310,95 360,90" fill="none" stroke="#2563eb" stroke-width="2" />
              <polyline points="10,135 60,130 110,120 160,125 210,110 260,115 310,110 360,105" fill="none" stroke="#22c55e" stroke-width="2" />
            </svg>
          </div>
        {:else if current === 'ads_meta'}
          <h1 class="text-2xl font-semibold">Meta Ads</h1>
          <div class="mt-3 flex items-center gap-3">
            <select bind:value={adsRange} class="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>7 Hari Terakhir</option>
              <option>30 Hari</option>
              <option>Semua</option>
            </select>
            <button class="btn bg-slate-100">Tugas Tim</button>
          </div>
          <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">Total Biaya</p>
              <p class="mt-1 text-xl font-semibold">Rp {metaMetrics.biaya.toFixed(2)}</p>
            </div>
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">Total Klik</p>
              <p class="mt-1 text-xl font-semibold">{metaMetrics.klik}</p>
            </div>
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">CTR</p>
              <p class="mt-1 text-xl font-semibold">{(metaMetrics.ctr * 100).toFixed(2)}%</p>
            </div>
            <div class="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p class="text-xs text-slate-500">Total Konversi</p>
              <p class="mt-1 text-xl font-semibold">{metaMetrics.konversi}</p>
            </div>
          </div>
        {:else if current === 'ads_completed'}
          <h1 class="text-2xl font-semibold">Completed Tasks</h1>
          <p class="mt-1 text-sm text-slate-600">Ringkasan tugas iklan yang selesai.</p>
          <div class="mt-4 rounded-xl bg-white ring-1 ring-slate-200 p-4">
            <ul class="space-y-2 text-sm">
              <li class="rounded-md border border-slate-200 p-3">Belum ada data.</li>
            </ul>
          </div>
        {:else if current === 'ugc'}
          <KanbanBoard compact boardSlug="ugc" title="UGC (Video)" subtitle="Plan and manage user-generated video content" />
          <TaskTable storageKey="ugc_task_table" scope="ugc" />
        {:else if current === 'design'}
          <KanbanBoard compact boardSlug="design" title="Design (Graphic)" subtitle="Manage all graphic design tasks from ideation to completion" />
          <TaskTable storageKey="design_task_table" scope="design" />
        {/if}
      </div>
    </main>
  </div>
</div>