<script setup lang="ts">
defineProps<{ page: number; totalPages: number }>();
defineEmits<{ change: [page: number] }>();
</script>
<template>
  <div class="row" role="navigation" aria-label="Pagination">
    <button class="btn" data-testid="prev-page" :disabled="page <= 1" @click="$emit('change', page - 1)">Prev</button>
    <span data-testid="page-info">Page {{ page }} of {{ totalPages }}</span>
    <button class="btn" data-testid="next-page" :disabled="page >= totalPages" @click="$emit('change', page + 1)">Next</button>
  </div>
</template>
