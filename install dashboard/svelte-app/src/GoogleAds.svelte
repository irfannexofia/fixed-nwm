<script>
  import { onMount } from 'svelte';
  import './GoogleAds.css';

  // Types (informal)
  /** @typedef {{id:number,name:string,status:string,clicks:number,impressions:number,cost:number,conversions:number}} Campaign */

  let campaigns = /** @type {Campaign[]} */([]);
  let isLoading = false;
  let error = null;

  const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });

  onMount(async () => {
    isLoading = true;
    error = null;
    try {
      const r = await fetch('/api/googleads/campaigns');
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(msg || `HTTP ${r.status}`);
      }
      const data = await r.json();
      campaigns = (data?.campaigns ?? []).map((c) => ({
        id: Number(c.id),
        name: String(c.name),
        status: String(c.status),
        clicks: Number(c.clicks || 0),
        impressions: Number(c.impressions || 0),
        cost: Number(c.cost || 0),
        conversions: Number(c.conversions || 0),
      }));
    } catch (e) {
      const msg = String(e?.message || e);
      error = msg.includes('Not authenticated') ? "Belum terhubung ke Google Ads. Klik 'Hubungkan Kampanye'." : msg;
    } finally {
      isLoading = false;
    }
  });

  $: totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  $: totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  $: totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
  $: totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  $: ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // To-Do List State
  let tasks = [
    { id: 1, text: 'Riset kata kunci baru untuk Kampanye Brand Awareness', completed: false, assignee: 'Alice', dueDate: '2025-10-10' },
    { id: 2, text: 'Optimasi iklan: tambah ekstensi sitelink', completed: true, assignee: 'Budi', dueDate: '2025-10-12' },
    { id: 3, text: 'Audit landing page untuk konversi lebih tinggi', completed: false, assignee: 'Citra', dueDate: '2025-10-15' },
    { id: 4, text: 'Cek budget harian semua kampanye', completed: false, assignee: 'Deni', dueDate: '2025-10-20' },
  ];
  let newTaskText = '';
  let filter = /** @type {'active'|'completed'} */('active');
  let drawerOpen = false;
  let isModalOpen = false;

  $: filteredTasks = tasks.filter((t) => (filter === 'active' ? !t.completed : t.completed));

  function addTask() {
    const text = newTaskText.trim();
    if (!text) return;
    const nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    tasks = [...tasks, { id: nextId, text, completed: false, assignee: 'Anda', dueDate: new Date().toISOString().slice(0, 10) }];
    newTaskText = '';
  }
  function toggleTask(id) { tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)); }
  function deleteTask(id) { tasks = tasks.filter((t) => t.id !== id); }
</script>

<div class="ga-container">
  <div class="ga-header">
    <div>
      <h1 class="ga-title">Google Ads</h1>
      <div class="ga-filter">
        <label for="range" class="sr-only">Rentang Tanggal</label>
        <select id="range">
          <option>7 Hari Terakhir</option>
          <option>30 Hari Terakhir</option>
          <option>Bulan Ini</option>
        </select>
      </div>
    </div>
    <div class="ga-actions">
      <button class="secondary-btn" on:click={() => (drawerOpen = true)}>Tugas Tim</button>
      <button class="primary-btn" on:click={() => (isModalOpen = true)}>+ Hubungkan Kampanye</button>
    </div>
  </div>

  <div class="ga-kpis">
    <div class="kpi-card">
      <div class="kpi-label">Total Biaya</div>
      <div class="kpi-value">{idr.format(totalCost)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Klik</div>
      <div class="kpi-value">{totalClicks.toLocaleString('id-ID')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">CTR</div>
      <div class="kpi-value">{ctr.toFixed(2)}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Konversi</div>
      <div class="kpi-value">{totalConversions.toLocaleString('id-ID')}</div>
    </div>
  </div>

  {#if isModalOpen}
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Hubungkan Akun Google Ads">
      <div class="modal-content" role="document">
        <button class="modal-close-btn" aria-label="Tutup" on:click={() => (isModalOpen = false)}>×</button>
        <h2>Hubungkan Akun Google Ads Anda</h2>
        <p>
          Anda akan diarahkan ke Google untuk memberikan izin aplikasi ini
          mengakses data kampanye dan metrik performa akun Anda.
        </p>
        <ul>
          <li>Melihat daftar kampanye</li>
          <li>Melihat metrik performa</li>
        </ul>
        <a class="modal-primary-btn" href="/auth/googleads">Login dengan Google</a>
      </div>
    </div>
  {/if}

  <div class="ga-chart">
    <svg viewBox="0 0 600 240" width="100%" height="240" role="img" aria-label="Performance chart">
      <g stroke="#f3f4f6">
        <line x1="24" y1="40" x2="576" y2="40" />
        <line x1="24" y1="100" x2="576" y2="100" />
        <line x1="24" y1="160" x2="576" y2="160" />
      </g>
      <!-- Minimal series placeholders -->
      <g stroke="#4f46e5"><polyline points="24,150 120,130 240,110 360,120 480,100 576,90" fill="none" /></g>
      <g stroke="#10b981"><polyline points="24,160 120,150 240,140 360,130 480,120 576,110" fill="none" /></g>
    </svg>
    <div class="legend">
      <span class="legend-item"><span class="status-dot enabled"></span>Klik</span>
      <span class="legend-item"><span class="status-dot paused"></span>Impressions</span>
    </div>
  </div>

  {#if error}
    <div class="kpi-card" style="margin-top:12px;color:#ef4444">{error}</div>
  {/if}

  <div class="table-wrap">
    {#if isLoading}
      <div class="kpi-card">Memuat kampanye…</div>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Nama Kampanye</th>
            <th>Status</th>
            <th>Klik</th>
            <th>Impressions</th>
            <th>Biaya</th>
            <th>Konversi</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {#each campaigns as c (c.id)}
            <tr>
              <td class="name-cell">{c.name}</td>
              <td><span class={`status-dot ${c.status.toLowerCase()}`}></span> {c.status}</td>
              <td>{c.clicks.toLocaleString('id-ID')}</td>
              <td>{c.impressions.toLocaleString('id-ID')}</td>
              <td>{idr.format(c.cost)}</td>
              <td>{c.conversions.toLocaleString('id-ID')}</td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn" title="View Details" aria-label="View">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="icon-btn" title="Pause Campaign" aria-label="Pause">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><line x1="10" y1="4" x2="10" y2="20"/><line x1="14" y1="4" x2="14" y2="20"/></svg>
                  </button>
                  <button class="icon-btn" title="View on Google Ads" aria-label="External">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  {#if drawerOpen}
    <div class="drawer-overlay" role="dialog" aria-modal="true" aria-label="Daftar Tugas Tim">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h2 class="todos-title">Daftar Tugas Tim (To-Do List)</h2>
          <button class="close-btn" aria-label="Tutup" on:click={() => (drawerOpen = false)}>×</button>
        </div>

        <div class="todos-controls">
          <div class="filter-tabs" role="tablist" aria-label="Task Filters">
            <button class={`tab ${filter === 'active' ? 'active' : ''}`} on:click={() => (filter = 'active')} role="tab" aria-selected={filter === 'active'}>Aktif</button>
            <button class={`tab ${filter === 'completed' ? 'active' : ''}`} on:click={() => (filter = 'completed')} role="tab" aria-selected={filter === 'completed'}>Selesai</button>
          </div>

          <div class="add-form">
            <input type="text" placeholder="Tulis tugas baru..." bind:value={newTaskText} on:keydown={(e) => { if (e.key === 'Enter') addTask(); }} />
            <button class="primary-btn" on:click={addTask}>Tambah Tugas</button>
          </div>
        </div>

        <ul class="task-list">
          {#each filteredTasks as t (t.id)}
            <li class={`task-item ${t.completed ? 'completed' : ''}`}>
              <input type="checkbox" checked={t.completed} on:change={() => toggleTask(t.id)} />
              <div>
                <div style="font-weight:600">{t.text}</div>
                <div class="due-date">Penanggung jawab: {t.assignee} • Tenggat: {t.dueDate}</div>
              </div>
              {#if t.completed}
                <button class="delete-btn" on:click={() => deleteTask(t.id)} aria-label="Delete"><span>Hapus</span></button>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>