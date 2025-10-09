<script lang="ts">
  import WorkPage from '../work-management/+page.svelte';
  const { params } = $props<{ params: { slug: string } }>();
  // You can use params.slug later for tenant-specific config.
</script>

<WorkPage />