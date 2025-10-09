<script lang="ts">
	let email = '';
	let password = '';
	let remember = true;
	function handleSubmit(e: Event) {
		e.preventDefault();
		console.log({ email, password, remember });
	}
</script>

<section class="relative min-h-[calc(100vh-4rem)] overflow-hidden">
	<div class="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-amber-50"></div>
	<div class="container-px mx-auto max-w-7xl py-10 lg:py-16">
		<div class="grid items-stretch gap-8 lg:grid-cols-2">
			<!-- Left brand panel -->
			<div class="relative hidden overflow-hidden rounded-2xl bg-deep p-8 text-white lg:block">
				<div class="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl"></div>
				<div class="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl"></div>
				<div class="relative z-10 flex h-full flex-col justify-between">
					<div>
						<span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">Secure • Scalable • Modern</span>
						<h1 class="mt-5 text-4xl font-bold leading-tight">Welcome back to NetPiu</h1>
						<p class="mt-3 max-w-md text-white/80">Sign in to continue optimizing your digital systems with enterprise-grade security and real-time insights.</p>
					</div>
					<ul class="mt-8 space-y-3 text-sm/6 text-white/80">
						<li class="flex items-center gap-3"><span class="grid h-6 w-6 place-items-center rounded-md bg-primary/30"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19l11-11-1.5-1.5z"/></svg></span> 99.99% uptime SLA</li>
						<li class="flex items-center gap-3"><span class="grid h-6 w-6 place-items-center rounded-md bg-primary/30"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19l11-11-1.5-1.5z"/></svg></span> SSO and MFA ready</li>
						<li class="flex items-center gap-3"><span class="grid h-6 w-6 place-items-center rounded-md bg-primary/30"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19l11-11-1.5-1.5z"/></svg></span> SOC2 & GDPR aligned</li>
					</ul>
				</div>
			</div>

			<!-- Right form card -->
			<div class="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
				<div class="text-center">
					<div class="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary text-white font-bold">N</div>
					<h2 class="text-2xl font-semibold text-deep">Sign in</h2>
					<p class="mt-1 text-sm text-slate-600">Use your company account or social login</p>
				</div>

				<form class="mt-6 grid gap-4" on:submit={handleSubmit}>
					<label class="grid gap-2">
						<span class="text-sm font-medium text-slate-700">Email</span>
						<input bind:value={email} type="email" required autocomplete="email" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
					</label>
					<label class="grid gap-2">
						<span class="text-sm font-medium text-slate-700">Password</span>
						<input bind:value={password} type="password" required autocomplete="current-password" class="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
					</label>
					<div class="flex items-center justify-between">
						<label class="flex items-center gap-2 text-sm text-slate-600">
							<input bind:checked={remember} type="checkbox" class="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
							<span>Remember me</span>
						</label>
						<button type="button" class="text-sm font-medium text-primary hover:underline">Forgot password?</button>
					</div>

					<button type="submit" class="btn-primary w-full">Sign in</button>
				</form>

				<div class="mt-6">
					<div class="relative" aria-hidden="true">
						<span class="block h-px w-full bg-slate-200"></span>
					</div>
					<div class="mt-4 grid grid-cols-3 gap-3">
						<button type="button" class="btn bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="h-5 w-5"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.551 31.91 29.155 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.868 5.1 29.702 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.868 5.1 29.702 3 24 3 16.318 3 9.656 7.335 6.306 14.691z"/><path fill="#4CAF50" d="M24 43c5.101 0 9.78-1.931 13.305-5.084l-6.147-5.195C29.133 34.091 26.715 35 24 35c-5.133 0-9.514-3.087-11.264-7.39l-6.53 5.034C9.5 39.556 16.227 43 24 43z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303C34.623 31.91 30.227 35 24 35c-5.133 0-9.514-3.087-11.264-7.39l-6.53 5.034C9.5 39.556 16.227 43 24 43c8.822 0 16.31-5.986 19.021-14.917z"/></svg></button>
						<button type="button" class="btn bg-black text-white hover:bg-zinc-900"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M16.365 1.43c-1.325.078-2.89.946-3.804 2.062-.835 1.015-1.603 2.45-1.389 3.871 1.463.046 2.952-.846 3.818-1.94.808-1.01 1.46-2.456 1.375-3.993zM20.963 16.425c-.074-3.95 3.227-5.85 3.375-5.938-1.843-2.689-4.706-3.057-5.71-3.097-2.431-.247-4.732 1.42-5.961 1.42-1.248 0-3.128-1.386-5.148-1.346-2.65.04-5.088 1.543-6.45 3.92-2.77 4.81-.704 11.906 1.99 15.8 1.318 1.903 2.871 4.03 4.936 3.953 1.99-.08 2.742-1.277 5.146-1.277 2.383 0 3.096 1.277 5.154 1.236 2.143-.04 3.494-1.94 4.802-3.85 1.506-2.2 2.123-4.33 2.162-4.44-.047-.02-4.154-1.59-4.196-6.38z"/></svg></button>
						<button type="button" class="btn bg-[#1877F2] text-white hover:bg-[#166FE5]"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M22 12a10 10 0 10-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.2 1.8.2v2h-1c-1 0-1.3.6-1.3 1.2V12h2.2l-.3 3h-1.9v7A10 10 0 0022 12z"/></svg></button>
					</div>
				</div>

				<p class="mt-6 text-center text-sm text-slate-600">Don’t have an account? <span class="font-medium text-primary">Contact us</span></p>
			</div>
		</div>
	</div>
</section>
