<script lang="ts">
	import '../app.css';
	let { children } = $props();

	const nav = [{ name: 'Home', href: '/' }, { name: 'Contact', href: '/contact' }];
</script>

<svelte:head>
  <title>NetPiu Work Management — Optimalkan Sistem Kerja</title>
  <meta name="description" content="NetPiu membantu tim mengoptimalkan sistem kerja dengan platform aman, cepat, dan skalabel untuk pemasaran, logistik, hingga penjualan." />
  <link rel="canonical" href="http://localhost:5176/" />
  <meta property="og:title" content="NetPiu Work Management" />
  <meta property="og:description" content="Platform untuk mengoptimalkan sistem kerja: aman, cepat, dan skalabel." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="http://localhost:5176/" />
  <meta property="og:image" content="http://localhost:5176/netpiu-work-management.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="NetPiu Work Management" />
  <meta name="twitter:description" content="Optimalkan sistem kerja Anda dengan NetPiu." />
  <meta name="twitter:image" content="http://localhost:5176/netpiu-work-management.webp" />
</svelte:head>

<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-deep focus:px-3 focus:py-2 focus:rounded-md">Skip to content</a>
<header class="sticky top-0 z-40 w-full bg-white/80 backdrop-blur border-b border-slate-100">
	<div class="container-px mx-auto max-w-7xl">
    <div class="flex h-16 items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <img src="/work-np.webp" alt="Work NP Logo" width="40" height="40" decoding="async" class="h-10 w-auto rounded-md" />
      </a>
      <nav aria-label="Primary" class="hidden md:flex items-center gap-6">
        {#each nav as item}
          <a href={item.href} class="text-sm font-medium text-slate-600 hover:text-deep transition-colors">{item.name}</a>
        {/each}
      </nav>
			<div class="flex items-center gap-3">
				<a href="/contact" class="btn-ghost hidden sm:inline-flex">Talk to us</a>
				<a href="/contact" class="btn-primary">Get started</a>
			</div>
		</div>
	</div>
</header>

<main id="main-content" class="min-h-[calc(100vh-4rem)]">
	{@render children()}
</main>

<footer class="border-t border-slate-100 bg-white">
	<div class="container-px mx-auto max-w-7xl py-10">
		<div class="flex flex-col md:flex-row items-center justify-between gap-6">
			<a href="/" class="flex items-center gap-2">
				<div class="h-8 w-8 rounded-md bg-primary/90 grid place-items-center text-white font-bold">N</div>
				<span class="font-heading text-lg text-deep">NetPiu</span>
			</a>
			<p class="text-sm text-slate-500">© 2024 NetPiu. All rights reserved.</p>
			<div class="flex items-center gap-4 text-slate-500">
				<a href="/" aria-label="Home" class="hover:text-deep transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M12 3l9 8h-3v10h-5v-6H11v6H6V11H3l9-8z"/></svg>
				</a>
				<a href="/contact" aria-label="Contact" class="hover:text-deep transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M20 4H4a2 2 0 00-2 2v12l4-4h14a2 2 0 002-2V6a2 2 0 00-2-2z"/></svg>
				</a>
			</div>
		</div>
	</div>
</footer>
