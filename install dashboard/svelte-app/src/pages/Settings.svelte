<script>
  import { onMount } from 'svelte';

  let name = '';
  let title = '';
  let logoUrl = '';
  let uploading = false;
  let saving = false;
  let message = '';
  let error = '';

  async function loadConfig() {
    try {
      const url = `${location.origin}/api/settings/config`;
      const res = await fetch(url);
      console.log('GET settings', url, res.status);
      const data = await res.json();
      // Default kosong agar UI terlihat clean saat loading/awal
      name = data?.name ?? '';
      title = data?.title ?? '';
      logoUrl = data?.logoUrl ?? '';
      message = '';
      error = '';
    } catch (e) {
      console.error('Load settings error', e);
      error = 'Gagal memuat konfigurasi Settings';
    }
  }

  async function saveConfig() {
    saving = true;
    message = '';
    error = '';
    try {
      const res = await fetch(`${location.origin}/api/settings/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, title })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan');
      message = 'Settings berhasil disimpan';
      // Beritahu komponen lain agar refresh settings
      try { window.dispatchEvent(new CustomEvent('settings:updated')); } catch {}
    } catch (e) {
      console.error('Save settings error', e);
      error = e?.message || 'Gagal menyimpan Settings';
    } finally {
      saving = false;
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onUploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    error = '';
    message = '';
    // Terima WEBP untuk kesederhanaan. Format lain bisa ditambah nanti.
    if (!file.type.includes('webp')) {
      error = 'Format logo harus WEBP untuk sekarang';
      return;
    }
    if (file.size > 500 * 1024) {
      error = 'Ukuran file maksimal 500KB';
      return;
    }
    uploading = true;
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`${location.origin}/api/settings/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal upload logo');
      logoUrl = data?.logoUrl || logoUrl;
      message = 'Logo berhasil diupload';
      // Beritahu komponen lain agar refresh logo
      try { window.dispatchEvent(new CustomEvent('settings:updated')); } catch {}
    } catch (e) {
      console.error('Upload logo error', e);
      error = e?.message || 'Gagal upload logo';
    } finally {
      uploading = false;
      // Reset input agar bisa upload file yang sama lagi jika perlu
      try { e.target.value = ''; } catch {}
    }
  }

  onMount(loadConfig);
</script>

<div class="set-wrap">
  <h1 class="set-title">Settings</h1>
  <p class="set-desc">Atur nama workflow, judul, dan logo.</p>

  <div class="set-grid">
    <div class="card">
      <div class="field">
        <label for="wf-name">Nama WorkFlow</label>
        <input id="wf-name" class="text" bind:value={name} placeholder="Netpiu Svelte" />
      </div>
      <div class="field">
        <label for="wf-title">Judul WorkFlow</label>
        <input id="wf-title" class="text" bind:value={title} placeholder="Work Management" />
      </div>
      <div class="actions">
        <button class="btn primary" disabled={saving} on:click={saveConfig}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </div>

    <div class="card">
      <div class="field">
        <label for="logo">Logo (WEBP, max 500KB)</label>
        <input id="logo" type="file" accept="image/webp" on:change={onUploadLogo} />
      </div>
      {#if logoUrl}
        <div class="preview">
          <img src={logoUrl} alt="Logo" />
        </div>
      {:else}
        <div class="preview empty">Belum ada logo</div>
      {/if}
    </div>
  </div>

  {#if message}
    <div class="note ok">{message}</div>
  {/if}
  {#if error}
    <div class="note err">{error}</div>
  {/if}
</div>

<style>
  .set-wrap { padding:20px; }
  .set-title { font-size:24px; font-weight:700; margin:0 0 6px; }
  .set-desc { color:#6b7280; margin-bottom:16px; }
  .set-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
  @media (max-width: 900px) { .set-grid { grid-template-columns: 1fr; } }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
  .field { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
  .field label { font-weight:600; color:#374151; }
  .text { height:40px; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; }
  .actions { display:flex; gap:8px; margin-top:8px; }
  .btn { border:1px solid #e5e7eb; background:#fff; color:#111827; padding:8px 10px; border-radius:10px; }
  .btn.primary { background:#4f46e5; color:#fff; border-color:#4f46e5; }
  .preview { border:1px solid #f3f4f6; background:#fafafa; border-radius:12px; padding:12px; display:flex; align-items:center; justify-content:center; min-height:120px; }
  .preview img { max-width:100%; max-height:120px; }
  .preview.empty { color:#6b7280; font-style:italic; }
  .note { margin-top:12px; padding:10px; border-radius:10px; }
  .note.ok { background:#ecfeff; color:#0e7490; border:1px solid #a5f3fc; }
  .note.err { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
</style>