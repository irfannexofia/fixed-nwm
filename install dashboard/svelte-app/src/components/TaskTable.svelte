<script>
  import { onMount, onDestroy } from 'svelte';
  export let storageKey = 'task_table';
  export let scope = 'ugc'; // penanda halaman (ugc/design)

  let title = '';
  let driveUrl = '';
  let caption = '';
  let status = 'Draft';
  let errorMessage = '';

  let rows = [];

  async function load() {
    try {
      const res = await fetch(`/api/briefs/${scope}`);
      const data = await res.json();
      rows = (data?.briefs ?? []).map((b) => ({
        id: b.id,
        title: b.brief,
        driveUrl: b.url || '',
        caption: b.caption || '',
        status: b.status,
      }));
    } catch (e) {
      console.error('Failed to load briefs', e);
      rows = [];
    }
  }

  async function add() {
    if (!title.trim()) return;
    try {
      const payload = { brief: title, url: driveUrl || null, caption: caption || null, status };
      const res = await fetch(`/api/briefs/${scope}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        errorMessage = data?.error ? `${data.error}` : 'Gagal menambahkan data';
        console.error('Create brief error', data);
        return;
      }
      const id = data?.id || `${Date.now()}`;
      rows = [{ id, title, driveUrl, caption, status }, ...rows];
      title = '';
      driveUrl = '';
      caption = '';
      status = 'Draft';
      errorMessage = '';
    } catch (e) {
      console.error('Failed to create brief', e);
      errorMessage = 'Terjadi kesalahan saat mengirim data';
    }
  }

  async function remove(id) {
    try {
      await fetch(`/api/briefs/${id}`, { method: 'DELETE' });
      rows = rows.filter(r => r.id !== id);
    } catch (e) {
      console.error('Failed to delete brief', e);
    }
  }

  onMount(load);

  // SSE: auto-reload ketika ada create/delete dari klien lain
  let sse;
  function attachSse() {
    try {
      const channel = `briefs:${scope || 'ugc'}`;
      sse = new EventSource(`/api/stream?channel=${encodeURIComponent(channel)}`);
      const reload = () => {
        load();
      };
      sse.addEventListener('briefs/create', reload);
      sse.addEventListener('briefs/delete', reload);
    } catch (e) {
      console.warn('SSE attach failed (briefs)', e);
    }
  }
  onMount(() => {
    load();
    attachSse();
  });
  onDestroy(() => {
    try { sse && sse.close(); } catch {}
  });
</script>

<div class="tt-wrap">
  <h2 class="tt-title">Task Table</h2>
  <p class="tt-desc">Tambahkan data Task, URL Google Drive, Caption, dan Status.</p>

  <div class="tt-form">
    <input class="tt-input" bind:value={title} placeholder="Task" />
    <input class="tt-input" bind:value={driveUrl} placeholder="URL GOOGLE DRIVE" />
    <input class="tt-input" bind:value={caption} placeholder="Caption" />
    <select class="tt-input" bind:value={status}>
      <option>Draft</option>
      <option>Ready</option>
      <option>Published</option>
    </select>
    <button class="tt-add" on:click={add}>Tambah</button>
  </div>
  {#if errorMessage}
    <div class="tt-error">{errorMessage}</div>
  {/if}

  <div class="tt-table">
    <div class="tt-head">
      <div>Task</div>
      <div>URL GOOGLE DRIVE</div>
      <div>Caption</div>
      <div>Status</div>
      <div>Aksi</div>
    </div>
    {#if rows.length === 0}
      <div class="tt-empty">Belum ada data. Tambahkan di formulir di atas.</div>
    {:else}
      {#each rows as r (r.id)}
        <div class="tt-row">
          <div class="ellipsis" title={r.title}>{r.title}</div>
          <div class="ellipsis" title={r.driveUrl}><a href={r.driveUrl} target="_blank" rel="noreferrer">{r.driveUrl}</a></div>
          <div class="ellipsis" title={r.caption}>{r.caption}</div>
          <div>{r.status}</div>
          <div><button class="tt-del" on:click={() => remove(r.id)}>Hapus</button></div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .tt-wrap { margin-top:24px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
  .tt-title { font-size:18px; font-weight:700; margin:0 0 6px; }
  .tt-desc { color:#6b7280; margin-bottom:12px; }
  .tt-form { display:grid; grid-template-columns: 1.2fr 1.2fr 1fr 0.8fr auto; gap:10px; align-items:center; }
  .tt-input { height:40px; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; }
  .tt-add { height:40px; border:1px solid #4f46e5; background:#4f46e5; color:#fff; border-radius:10px; padding:0 16px; font-weight:600; }
  .tt-add:hover { background:#4338ca; }

  .tt-table { margin-top:12px; }
  .tt-head, .tt-row { display:grid; grid-template-columns: 1.2fr 1.2fr 1fr 0.8fr auto; gap:10px; align-items:center; }
  .tt-head { color:#111827; font-weight:700; padding:10px 0; }
  .tt-row { background:#fff; border-top:1px solid #f3f4f6; padding:10px 0; }
  .tt-empty { color:#6b7280; font-style:italic; padding:12px 0; }
  .tt-error { color:#ef4444; margin-top:8px; }
  .tt-del { border:1px solid #ef4444; color:#ef4444; background:#fff; border-radius:10px; padding:6px 10px; }
  .tt-del:hover { background:#fee2e2; }
  .ellipsis { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }

  @media (max-width: 900px) {
    .tt-form, .tt-head, .tt-row { grid-template-columns: 1fr; }
    .tt-add { width:100%; }
  }
</style>