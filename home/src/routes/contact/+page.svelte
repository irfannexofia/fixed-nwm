<script lang="ts">
  let name = '';
  let company = '';
  let message = '';
  function submit(e: Event) {
    e.preventDefault();
    const phone = '6285213000874';
    const text = encodeURIComponent(`Halo NetPiu, saya ${name} dari ${company}.\n\nPesan:\n${message}`);
    const url = `https://wa.me/${phone}?text=${text}`;
    window.location.href = url;
  }
</script>

<svelte:head>
  <title>Kontak NetPiu — Hubungi Kami</title>
  <meta name="description" content="Hubungi NetPiu untuk konsultasi sistem kerja, pemasaran, logistik, dan penjualan. Kami siap membantu tim Anda berkembang." />
</svelte:head>

<section class="bg-gradient-to-b from-white to-blue-50/50">
	<div class="container-px mx-auto max-w-3xl py-16 lg:py-24">
		<h1 class="text-4xl font-bold">Contact NetPiu</h1>
		<p class="mt-3 text-slate-600">Tell us about your project and we’ll reply within one business day.</p>

		<form class="mt-10 grid gap-4" on:submit={submit}>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="grid gap-2">
					<span class="text-sm font-medium text-slate-700">Nama</span>
					<input bind:value={name} required type="text" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
				</label>
				<label class="grid gap-2">
					<span class="text-sm font-medium text-slate-700">Nama Perusahaan</span>
					<input bind:value={company} required type="text" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
				</label>
			</div>
			<label class="grid gap-2">
				<span class="text-sm font-medium text-slate-700">Message</span>
				<textarea bind:value={message} required rows="6" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"></textarea>
			</label>
			<div class="flex items-center justify-end gap-3">
				<a href="/" class="btn-ghost">Cancel</a>
				<button type="submit" class="btn-primary">Send message</button>
			</div>
		</form>
	</div>
</section>
