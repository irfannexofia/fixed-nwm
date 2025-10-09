<script>
  import { onMount } from 'svelte';

  // State
  let currentDate = new Date();
  let selectedKey = new Date().toISOString().slice(0, 10);
  let showAdd = false;
  let contextMenu = /** @type {{ x:number; y:number; key:string|null }|null} */(null);
  let timeZone = 'Asia/Jakarta';

  /** @type {Record<string, { id:string; title:string; note?:string }[]>} */
  let eventsByDay = {};

  /** @type {Record<string, string>} */
  let colorsByDay = {};

  // Add form state
  let newTitle = '';
  let newTime = '09:00';
  let newNotes = '';

  async function loadCellsForMonth(date) {
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/calendar/cells?month=${month}`);
      const data = await res.json();
      const map = {};
      for (const c of (data?.cells ?? [])) { if (c.color) map[c.date] = c.color; }
      colorsByDay = map;
    } catch (e) {
      console.error('Failed to load calendar cells', e);
    }
  }

  async function loadDayEvents(dateStr) {
    try {
      const res = await fetch(`/api/calendar/day-events?date=${encodeURIComponent(dateStr)}`);
      const data = await res.json();
      eventsByDay = { ...eventsByDay, [dateStr]: (data?.events ?? []).map((ev) => ({ id: ev.id, title: ev.title, time: ev.time || '', notes: ev.notes || '' })) };
    } catch (e) {
      console.error('Failed to load day events', e);
    }
  }

  onMount(() => {
    const closeMenu = () => (contextMenu = null);
    window.addEventListener('click', closeMenu);
    loadCellsForMonth(currentDate);
    loadDayEvents(selectedKey);
    return () => window.removeEventListener('click', closeMenu);
  });

  // Helpers
  function fmtMonth(date) {
    return date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  }
  function keyFor(y, m, d) {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function firstWeekday(y, m) { return new Date(y, m, 1).getDay(); } // 0=Sun

  function gotoPrev() { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); currentDate = d; loadCellsForMonth(d); }
  function gotoNext() { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); currentDate = d; loadCellsForMonth(d); }

  function selectDay(key) { selectedKey = key; showAdd = false; contextMenu = null; loadDayEvents(key); }
  function openMenu(e, key) { e.preventDefault(); contextMenu = { x: e.clientX, y: e.clientY, key }; }

  // Events
  async function addEvent() {
    const t = newTitle.trim(); if (!t) return;
    try {
      const res = await fetch('/api/calendar/day-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedKey, title: t, tz: timeZone, time: newTime || null, notes: newNotes || null }),
      });
      const data = await res.json();
      const id = data?.id || Math.random().toString(36).slice(2);
      const list = eventsByDay[selectedKey] || [];
      eventsByDay = { ...eventsByDay, [selectedKey]: [...list, { id, title: t }] };
      showAdd = false;
      newTitle = '';
      newTime = '09:00';
      newNotes = '';
    } catch (e) {
      console.error('Failed to add event', e);
    }
  }
  async function removeEvent(id) {
    try {
      await fetch(`/api/calendar/day-events/${id}`, { method: 'DELETE' });
      const list = eventsByDay[selectedKey] || [];
      eventsByDay = { ...eventsByDay, [selectedKey]: list.filter((e) => e.id !== id) };
    } catch (e) {
      console.error('Failed to remove event', e);
    }
  }

  // Colors
  async function setColor(key, hex) {
    try {
      await fetch('/api/calendar/cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: key, color: hex, tz: timeZone }),
      });
      colorsByDay = { ...colorsByDay, [key]: hex };
    } catch (e) {
      console.error('Failed to set color', e);
    } finally {
      contextMenu = null;
    }
  }
  async function clearColor(key) {
    try {
      await fetch(`/api/calendar/cell?date=${encodeURIComponent(key)}`, { method: 'DELETE' });
      const copy = { ...colorsByDay }; delete copy[key]; colorsByDay = copy;
    } catch (e) {
      console.error('Failed to clear color', e);
    } finally {
      contextMenu = null;
    }
  }
</script>

<div class="cal-container">
  <div class="cal-header">
    <button class="nav-btn" on:click={gotoPrev} aria-label="Sebelumnya">◀</button>
    <h1 class="month-title">{fmtMonth(currentDate)}</h1>
    <button class="nav-btn" on:click={gotoNext} aria-label="Berikutnya">▶</button>
  </div>

  <div class="timezone-row">
    <label>Zona waktu:</label>
    <select bind:value={timeZone} aria-label="Zona waktu">
      <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
      <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
      <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
      <option value="UTC">UTC</option>
      <option value="Asia/Singapore">Asia/Singapore</option>
    </select>
    <div class="tz-info"></div>
  </div>

  <div class="grid-wrap">
    <div class="grid-left">
      <div class="dow-row">
        <div class="dow">Min</div>
        <div class="dow">Sen</div>
        <div class="dow">Sel</div>
        <div class="dow">Rab</div>
        <div class="dow">Kam</div>
        <div class="dow">Jum</div>
        <div class="dow">Sab</div>
      </div>

      <div class="cal-grid">
        {#key `${currentDate.getFullYear()}-${currentDate.getMonth()}`}
          {#each (function() {
            const y = currentDate.getFullYear();
            const m = currentDate.getMonth();
            const lead = firstWeekday(y, m);
            const days = daysInMonth(y, m);
            const cells = [];
            for (let i = 0; i < lead; i++) cells.push(null);
            for (let d = 1; d <= days; d++) cells.push({ y, m, d });
            // pad to full weeks (35 or 42 cells)
            const padTarget = cells.length <= 35 ? 35 : 42;
            while (cells.length < padTarget) cells.push(null);
            return cells;
          })() as cell}
            {#if cell === null}
              <div class="day empty" aria-hidden></div>
            {:else}
              <div
                class={`day ${selectedKey === keyFor(cell.y, cell.m, cell.d) ? 'selected' : ''}`}
                role="button"
                tabindex="0"
                on:click={() => selectDay(keyFor(cell.y, cell.m, cell.d))}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectDay(keyFor(cell.y, cell.m, cell.d)); }}
                on:contextmenu={(e) => openMenu(e, keyFor(cell.y, cell.m, cell.d))}
              >
                <span class="day-number">{cell.d}</span>
                <div class="day-right">
                  {#if colorsByDay[keyFor(cell.y, cell.m, cell.d)]}<span class="color-dot" style={`background:${colorsByDay[keyFor(cell.y, cell.m, cell.d)]}`}></span>{/if}
                  {#if (eventsByDay[keyFor(cell.y, cell.m, cell.d)] && eventsByDay[keyFor(cell.y, cell.m, cell.d)].length)}<span class="event-dot" aria-hidden>•</span>{/if}
                </div>
              </div>
            {/if}
          {/each}
        {/key}
      </div>
    </div>

    <aside class="side-panel">
      <div class="side-header">
        <h2>Events for {selectedKey}</h2>
        <button class="add-btn" on:click={() => (showAdd = true)}>+ Add</button>
      </div>
      {#if showAdd}
        <div class="form-card" role="form" aria-label="Add Event">
          <div class="form-field">
            <label>Title</label>
            <input class="text" type="text" bind:value={newTitle} placeholder="Meeting, content shoot, etc." />
          </div>
          <div class="form-field">
            <label>Time</label>
            <input class="text" type="time" bind:value={newTime} />
          </div>
          <div class="form-field">
            <label>Notes</label>
            <textarea class="textarea" rows="3" bind:value={newNotes} placeholder="Details..."></textarea>
          </div>
          <div class="form-actions">
            <button class="btn primary" on:click={addEvent}>Save</button>
            <button class="btn" on:click={() => { showAdd = false; newTitle=''; newNotes=''; }}>Cancel</button>
          </div>
        </div>
      {/if}
      {#if !(eventsByDay[selectedKey] && eventsByDay[selectedKey].length)}
        <div class="empty-note">No events</div>
      {:else}
        <ul class="event-list">
          {#each eventsByDay[selectedKey] as ev (ev.id)}
            <li class="event-item">
              <span>{ev.title}{ev.time ? ` — ${ev.time}` : ''}</span>
              <button class="del" on:click={() => removeEvent(ev.id)} aria-label="Delete">×</button>
            </li>
          {/each}
        </ul>
      {/if}
    </aside>
  </div>

  <!-- Inline add form in side panel style -->
  <!-- No modal: follow spec Title/Time/Notes with Save/Cancel -->

  {#if contextMenu}
    <div class="menu-backdrop" on:click={() => (contextMenu = null)}></div>
    <div class="color-menu" style={`top:${contextMenu.y}px;left:${contextMenu.x}px`}>
      <div class="menu-title">Add colour</div>
      <div class="swatches">
        <button class="sw red" on:click={() => setColor(contextMenu.key, '#fecaca')}>Red</button>
        <button class="sw green" on:click={() => setColor(contextMenu.key, '#d1fae5')}>Green</button>
        <button class="sw blue" on:click={() => setColor(contextMenu.key, '#dbeafe')}>Blue</button>
      </div>
      <div class="custom-row">
        <span class="preview" style={`background:${colorsByDay[contextMenu.key] || '#3b82f6'}`}></span>
        <input class="hex" type="text" placeholder="#3b82f6" on:change={(e) => setColor(contextMenu.key, e.target.value)} />
      </div>
      <button class="clear" on:click={() => clearColor(contextMenu.key)}>Clear colour</button>
    </div>
  {/if}
</div>

<style>
  .cal-container { max-width: 1100px; margin: 24px auto; padding: 16px; }
  .cal-header { display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px 16px; }
  .month-title { font-size:22px; font-weight:700; color:#111827; }
  .nav-btn { border:1px solid #e5e7eb; background:#fff; color:#374151; padding:8px 10px; border-radius:10px; cursor:pointer; }
  .nav-btn:hover { background:#f9fafb; }

  .timezone-row { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px 16px; margin-top:12px; }
  .timezone-row select { border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }

  .grid-wrap { display:grid; grid-template-columns: 2fr 1fr; gap:16px; margin-top:12px; }
  @media (max-width: 900px) { .grid-wrap { grid-template-columns: 1fr; } }

  .dow-row { display:grid; grid-template-columns: repeat(7, 1fr); gap:12px; margin-bottom:8px; padding:0 8px; }
  .dow { color:#6b7280; text-align:center; font-size:12px; }

  .cal-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:12px; }
  .day { display:flex; align-items:center; justify-content:space-between; border:1px solid #e5e7eb; background:#fff; border-radius:12px; padding:14px; min-height:72px; cursor:pointer; }
  .day:hover { background:#f9fafb; }
  .day.empty { background:#f3f4f6; border-style:dashed; }
  .day.selected { box-shadow: 0 0 0 3px #e0e7ff inset; border-color:#c7d2fe; }
  .day-number { font-weight:600; color:#1f2937; }
  .day-right { display:flex; align-items:center; gap:6px; }
  .color-dot { width:16px; height:16px; border-radius:6px; border:1px solid rgba(0,0,0,0.06); }
  .event-dot { color:#9ca3af; font-size:18px; line-height:1; }

  .side-panel { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
  .side-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .add-btn { border:1px solid #4f46e5; background:#eef2ff; color:#4f46e5; padding:8px 10px; border-radius:10px; font-weight:600; }
  .add-btn:hover { background:#e0e7ff; }
  .form-card { background:#fff; border:1px solid #eef2f7; border-radius:12px; padding:12px; margin-bottom:10px; }
  .form-field { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
  .form-field label { font-weight:600; color:#374151; }
  .form-card .text, .form-card .textarea { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }
  .form-actions { display:flex; gap:8px; }
  .empty-note { color:#6b7280; font-style:italic; }
  .event-list { display:flex; flex-direction:column; gap:8px; }
  .event-item { display:flex; align-items:center; justify-content:space-between; border:1px solid #eef2f7; border-radius:10px; padding:8px 10px; }
  .event-item .del { border:none; background:transparent; color:#6b7280; font-size:18px; cursor:pointer; }

  /* Modal */
  .modal-backdrop { position:fixed; inset:0; background:rgba(17,24,39,0.35); display:flex; align-items:center; justify-content:center; z-index:60; }
  .modal { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width:360px; max-width:92vw; }
  .modal h3 { margin:0 0 8px; font-size:18px; font-weight:700; }
  .modal input.text { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }
  .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
  .btn { border:1px solid #e5e7eb; background:#fff; color:#111827; padding:8px 10px; border-radius:10px; }
  .btn.primary { background:#4f46e5; color:#fff; border-color:#4f46e5; }

  /* Context color menu */
  .menu-backdrop { position:fixed; inset:0; z-index:59; background:transparent; }
  .color-menu { position:fixed; z-index:60; background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,0.15); padding:12px; min-width:220px; }
  .menu-title { font-weight:700; margin-bottom:8px; }
  .swatches { display:flex; gap:8px; margin-bottom:10px; }
  .sw { border:1px solid #e5e7eb; border-radius:12px; padding:8px 12px; font-weight:600; cursor:pointer; }
  .sw.red { background:#fee2e2; color:#b91c1c; }
  .sw.green { background:#dcfce7; color:#065f46; }
  .sw.blue { background:#dbeafe; color:#1e40af; }
  .custom-row { display:flex; align-items:center; gap:8px; }
  .preview { width:28px; height:20px; border-radius:6px; border:1px solid #e5e7eb; }
  .hex { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:6px 10px; }
  .clear { display:block; margin-top:10px; border:1px solid #e5e7eb; background:#fff; color:#374151; padding:8px 10px; border-radius:10px; }
</style>