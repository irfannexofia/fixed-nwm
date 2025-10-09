<script>
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  export let currentRoute = 'ads/google';
  let adsOpen = true;
  let plannerOpen = true;

  // Settings-driven UI values (default kosong saat loading)
  let settingsName = '';
  let settingsTitle = '';
  let logoUrl = '';

  function navigate(route) {
    dispatch('navigate', { route });
  }

  async function loadSettings() {
    try {
      const res = await fetch(`${location.origin}/api/settings/config`);
      const data = await res.json();
      settingsName = data?.name ?? settingsName;
      settingsTitle = data?.title ?? settingsTitle;
      logoUrl = data?.logoUrl ?? logoUrl;
    } catch (e) {
      console.error('Sidebar: gagal memuat settings', e);
    }
  }

  onMount(() => {
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener('settings:updated', handler);
    return () => window.removeEventListener('settings:updated', handler);
  });
</script>

<aside class="sidebar" aria-label="Main navigation">
  <div class="brand">
    <img src={logoUrl || 'netpiu-logo-ccl.webp?v=2'} alt="Netpiu" width="36" height="36" />
    <div class="brand-text">
      <strong>{settingsTitle || ''}</strong>
    </div>
  </div>

  <nav class="menu" role="menu">
    <button class={`item ${currentRoute === 'board' ? 'active' : ''}`} role="menuitem" on:click={() => navigate('board')}>
      <span class="icon">🔲</span>
      <span>Board</span>
    </button>

    <button class={`item ${currentRoute === 'calendar' ? 'active' : ''}`} role="menuitem" on:click={() => navigate('calendar')}>
      <span class="icon">📅</span>
      <span>Calendar</span>
    </button>

    <div class="section">
      <button class="section-toggle" aria-expanded={adsOpen} on:click={() => (adsOpen = !adsOpen)}>
        <span class="icon">📣</span>
        <span>Ads</span>
        <span class="chev" aria-hidden="true">{adsOpen ? '▾' : '▸'}</span>
      </button>
      {#if adsOpen}
        <div class="submenu">
          <button class={`subitem ${currentRoute === 'ads/google' ? 'active' : ''}`} on:click={() => navigate('ads/google')}>Google Ads</button>
          <button class={`subitem ${currentRoute === 'ads/meta' ? 'active' : ''}`} on:click={() => navigate('ads/meta')}>Meta Ads</button>
        </div>
      {/if}
    </div>

    <div class="section">
      <button class="section-toggle" aria-expanded={plannerOpen} on:click={() => (plannerOpen = !plannerOpen)}>
        <span class="icon">✏️</span>
        <span>Content Planner</span>
        <span class="chev" aria-hidden="true">{plannerOpen ? '▾' : '▸'}</span>
      </button>
      {#if plannerOpen}
        <div class="submenu">
          <button class={`subitem ${currentRoute === 'planner/ugc' ? 'active' : ''}`} on:click={() => navigate('planner/ugc')}>UGC (Video)</button>
          <button class={`subitem ${currentRoute === 'planner/design' ? 'active' : ''}`} on:click={() => navigate('planner/design')}>Design (Graphic)</button>
        </div>
      {/if}
    </div>
  </nav>

  <div class="footer">
    <button class={`item ${currentRoute === 'settings' ? 'active' : ''}`} role="menuitem" on:click={() => navigate('settings')} style="margin-bottom:12px">
      <span class="icon">⚙️</span>
      <span>Settings</span>
    </button>
    <button class="new-project" on:click={() => alert('New Project placeholder')}>+
      <span>New Project</span>
    </button>
  </div>
</aside>

<style>
  .sidebar { width: 280px; background:#fff; border-right:1px solid #e5e7eb; display:flex; flex-direction:column; height:100vh; position:sticky; top:0; }
  .brand { display:flex; align-items:center; gap:10px; padding:16px; }
  .brand-text { display:flex; flex-direction:column; font-size:20px; line-height:1.05; }
  .menu { padding:12px; display:flex; flex-direction:column; gap:8px; }
  .item { display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; background:#fff; border:1px solid #e5e7eb; color:#111827; text-align:left; }
  .item.active { background:#4f46e5; color:#fff; border-color:#4f46e5; }
  .icon { width:20px; text-align:center; }
  .section { margin-top:8px; }
  .section-toggle { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; padding:12px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; color:#111827; }
  .chev { margin-left:auto; color:#6b7280; }
  .submenu { display:flex; flex-direction:column; gap:6px; padding:8px 6px 0 24px; }
  .subitem { text-align:left; padding:10px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#374151; }
  .subitem.active { background:#ede9fe; border-color:#c7d2fe; color:#111827; }
  .subitem:hover { background:#f9fafb; }
  .footer { margin-top:auto; padding:16px; }
  .new-project { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border-radius:10px; background:#4f46e5; color:#fff; border:1px solid #4f46e5; font-weight:600; }
  .new-project:hover { background:#4338ca; }
</style>