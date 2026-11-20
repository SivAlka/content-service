<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api/client';
import type { Stats } from '../types';

const stats = ref<Stats | null>(null);
const error = ref('');
onMounted(async () => {
  try { stats.value = await api.stats(); } catch (e) { error.value = (e as Error).message; }
});
</script>

<template>
  <h1>Dashboard</h1>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="!stats">Loading…</p>
  <template v-else>
    <div class="grid">
      <div class="card"><div class="muted">Total</div><div class="stat">{{ stats.total }}</div></div>
      <div v-for="(n, s) in stats.byStatus" :key="s" class="card">
        <div class="muted">{{ s.replace('_', ' ') }}</div><div class="stat">{{ n }}</div>
      </div>
    </div>
    <div class="card">
      <h3>Top tags</h3>
      <RouterLink v-for="t in stats.topTags" :key="t.tag" class="tag" :to="{ name: 'articles', query: { tag: t.tag } }">
        {{ t.tag }} ({{ t.count }})
      </RouterLink>
    </div>
  </template>
</template>
