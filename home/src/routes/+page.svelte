<script lang="ts">
  import FeaturedProducts from '$lib/FeaturedProducts.svelte';
	const stats = [
		{ label: 'Fastest framework', value: '99.99%' },
		{ label: 'Data Request', value: '0,1ms' },
		{ label: 'Data Security', value: '100%' }
	];
	const features = [
		{
			title: 'Secure by design',
			desc: 'Enterprise-grade security, from encryption at rest to least-privilege access.',
			icon: '<path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />'
		},
		{
			title: 'Scalable architecture',
			desc: 'Auto-scaling infrastructure to handle any traffic spike with confidence.',
			icon: '<path d="M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 16h6v4h-6z" />'
		},
		{
			title: 'Actionable insights',
			desc: 'Real-time analytics to optimize your systems and accelerate growth.',
			icon: '<path d="M3 13h4v8H3zM10 3h4v18h-4zM17 8h4v13h-4z" />'
		}
	];
</script>

<svelte:head>
  <title>NetPiu — Sistem Kerja Cepat dan Aman</title>
  <meta name="description" content="Rangkai sistem kerja Anda untuk hasil lebih cepat. NetPiu menghadirkan performa, keamanan, dan skalabilitas untuk tim modern." />
</svelte:head>

<section class="relative overflow-hidden">
	<div class="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-amber-50"></div>
	<div class="container-px mx-auto max-w-7xl py-20 lg:py-28">
		<div class="grid items-center gap-12 lg:grid-cols-2">
			<div>
				<span class="badge">Simplify Work, Timely Results☑</span>
				<h1 class="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
					Rangkai Sistem Kerja Anda dan Dapatkan Hasil Lebih Cepat
				</h1>
				<p class="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
					Kami membuat semua peralatan Digital yang memudahkan anda dalam bekerja, semakin mudah, sehingga banyak waktu yang bisa anda manfaatkan
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<a class="btn-primary" href="#produk-unggulan">Prodak Kami</a>
					<a class="btn-accent" href="/contact">Talk to an expert</a>
				</div>
				<div class="mt-10 grid grid-cols-3 gap-6 max-w-lg">
                    {#each stats as s}
                        <div class="rounded-lg bg-white ring-1 ring-slate-200 p-4 text-center">
                            <p class="text-2xl font-semibold text-deep">{s.value}</p>
                            <p class="text-xs text-slate-700">{s.label}</p>
                        </div>
                    {/each}
				</div>
			</div>
			<div class="relative">
				<div class="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 blur-2xl"></div>
            <div class="rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
                    <img src="/work-np.webp" alt="Work NP Logo" class="rounded-xl w-full h-auto" />
                    <p class="mt-3 text-xs text-slate-500">NetPiu</p>
                </div>
			</div>
		</div>
	</div>
</section>

<section class="bg-white">
	<div class="container-px mx-auto max-w-7xl py-16 lg:py-20">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="text-3xl font-semibold sm:text-4xl">Mengapa Harus Work dari NetPiu</h2>
			<p class="mt-3 text-slate-600">Technology that balances trust, innovation, and growth.</p>
		</div>
		<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f}
				<div class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
                    <div class="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" aria-hidden="true" focusable="false">{@html f.icon}</svg>
                    </div>
					<h3 class="mt-4 text-lg font-semibold">{f.title}</h3>
					<p class="mt-2 text-sm text-slate-600">{f.desc}</p>
				</div>
			{/each}
		</div>
		<div class="mt-12 flex items-center justify-center">
			<a href="/contact" class="btn-ghost">See full feature list</a>
		</div>
	</div>
</section>

<FeaturedProducts />

<section class="bg-deep">
	<div class="container-px mx-auto max-w-7xl py-14">
		<div class="flex flex-col items-center justify-between gap-6 lg:flex-row">
			<h3 class="text-white text-2xl font-semibold">Ready to accelerate your digital transformation?</h3>
			<div class="flex items-center gap-3">
				<a href="/contact" class="btn bg-white text-deep hover:bg-slate-100">Get started</a>
				<a href="/contact" class="btn bg-accent text-white hover:bg-orange-600">Contact sales</a>
			</div>
		</div>
	</div>
</section>
