<script>
  import Sidebar from './components/Sidebar.svelte';
  import GoogleAds from './GoogleAds.svelte';
  import Board from './pages/Board.svelte';
  import Calendar from './pages/Calendar.svelte';
  import MetaAds from './pages/MetaAds.svelte';
  import ContentUGC from './pages/ContentUGC.svelte';
  import ContentDesign from './pages/ContentDesign.svelte';
  import Settings from './pages/Settings.svelte';
  import { onMount } from 'svelte';

  let currentRoute = 'ads/google';
  const validRoutes = ['ads/google','ads/meta','planner/ugc','planner/design','calendar','board','settings'];

  function setRoute(route) {
    currentRoute = route;
    if (typeof window !== 'undefined') {
      window.location.hash = route;
      try { localStorage.setItem('currentRoute', route); } catch {}
    }
  }

  function onNavigate(e) { setRoute(e.detail.route); }

  onMount(() => {
    let initial = 'ads/google';
    try {
      const fromHash = window.location.hash?.replace('#','') || '';
      if (fromHash && validRoutes.includes(fromHash)) initial = fromHash;
      else {
        const stored = localStorage.getItem('currentRoute');
        if (stored && validRoutes.includes(stored)) initial = stored;
      }
    } catch {}
    currentRoute = initial;

    const handler = () => {
      const h = window.location.hash?.replace('#','') || '';
      if (h && validRoutes.includes(h)) currentRoute = h;
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });
</script>

<main style="display:flex">
  <Sidebar {currentRoute} on:navigate={onNavigate} />
  <section style="flex:1; max-width:1100px; margin:24px auto; padding:0 16px">
    {#if currentRoute === 'ads/google'}
      <GoogleAds />
    {:else if currentRoute === 'ads/meta'}
      <MetaAds />
    {:else if currentRoute === 'planner/ugc'}
      <ContentUGC />
    {:else if currentRoute === 'planner/design'}
      <ContentDesign />
    {:else if currentRoute === 'calendar'}
      <Calendar />
    {:else if currentRoute === 'settings'}
      <Settings />
    {:else}
      <Board />
    {/if}
  </section>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: #f3f4f6; }
</style>