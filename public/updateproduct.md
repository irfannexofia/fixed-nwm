Anda adalah seorang ahli developer SvelteKit. Tugas Anda adalah membuat sebuah komponen Svelte (`.svelte`) untuk bagian "Produk Unggulan" sebuah website.

**Nama File:** `FeaturedProducts.svelte`

**Persyaratan Teknologi:**
* Gunakan Svelte untuk struktur komponen.
* Gunakan Tailwind CSS untuk semua styling. Pastikan desainnya modern, bersih, dan responsif.
* Untuk ikon, gunakan library ikon SVG populer seperti `lucide-svelte` atau `svelte-herocions`. Jika tidak bisa, gunakan SVG inline.

**Struktur dan Konten Komponen:**

1.  **Container Utama (`<section>`):**
    * Beri padding vertikal yang cukup (misalnya, `py-16` atau `py-24`).
    * Pusatkan konten di dalamnya dengan `max-w-7xl` dan `mx-auto`.

2.  **Bagian Header Teks:**
    * Pusatkan teks di bagian ini.
    * **Judul Utama (`<h2>`):**
        * Teks: "Solusi Digital untuk Setiap Kebutuhan Bisnis"
        * Styling: Ukuran font besar (misal, `text-3xl` atau `text-4xl`), tebal (`font-bold`), dan warna teks gelap (`text-gray-900`).
    * **Subjudul (`<p>`):**
        * Teks: "Kami menyediakan platform khusus yang dirancang untuk mengoptimalkan berbagai aspek operasional bisnis Anda, dari pemasaran hingga manajemen inventaris."
        * Styling: Ukuran font standar (`text-lg`), warna teks abu-abu (`text-gray-600`), dan beri jarak dari judul (`mt-4`).

3.  **Grid untuk Kartu Produk:**
    * Gunakan `div` sebagai container grid. Beri jarak dari header teks (`mt-12`).
    * Gunakan `grid`. Atur agar menampilkan 1 kolom di mobile, dan 3 kolom di layar medium ke atas (`grid-cols-1 md:grid-cols-3`).
    * Beri jarak antar kartu (`gap-8`).

4.  **Desain Kartu Produk (Untuk setiap produk):**
    * Gunakan tag `div` untuk setiap kartu.
    * Styling kartu: Background putih (`bg-white`), border (`border border-gray-200`), sudut membulat (`rounded-lg`), shadow halus (`shadow-md`), dan padding internal (`p-6`). Tambahkan transisi halus untuk hover effect.

5.  **Konten Detail untuk Setiap Kartu:**

    * **Kartu 1: Digital Marketing**
        * **Ikon:** Gunakan ikon yang merepresentasikan analisis atau marketing (misal, dari `lucide-svelte`: `<ChartBar />`). Ikon harus berada di dalam sebuah `div` dengan background berwarna lembut (misal, `bg-blue-100`) dan bentuk bulat (`rounded-full`). Ukuran ikon sekitar `h-8 w-8` dengan warna (misal, `text-blue-600`).
        * **Judul (`<h3>`):** "Digital Marketing Work Management" (Styling: `text-xl font-semibold mt-4`).
        * **Deskripsi (`<p>`):** "Kelola semua kampanye dan tugas marketing digital Anda dalam satu platform terpusat untuk hasil yang maksimal." (Styling: `text-gray-500 mt-2`).

    * **Kartu 2: Logistik**
        * **Ikon:** Gunakan ikon truk (misal, `<Truck />`). Styling ikon mirip dengan kartu pertama, tapi gunakan warna yang berbeda (misal, `bg-green-100` dan `text-green-600`).
        * **Judul (`<h3>`):** "Transportation & Logistics Management"
        * **Deskripsi (`<p>`):** "Optimalkan seluruh rantai pasok Anda, mulai dari pelacakan pengiriman real-time hingga manajemen armada."

    * **Kartu 3: Showroom**
        * **Ikon:** Gunakan ikon gedung atau toko (misal, `<BuildingStorefront />`). Styling ikon mirip dengan kartu pertama, tapi gunakan warna yang berbeda (misal, `bg-orange-100` dan `text-orange-600`).
        * **Judul (`<h3>`):** "Showroom Inventory & Sales Management"
        * **Deskripsi (`<p>`):** "Sederhanakan pengelolaan stok di showroom Anda, lacak ketersediaan unit, dan percepat proses penjualan."

Tolong hasilkan kode yang bersih dan siap pakai dalam satu file `.svelte`.