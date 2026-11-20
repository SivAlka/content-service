<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import { STATUSES, type Article, type Page } from '../types';
import StatusBadge from '../components/StatusBadge.vue';
import Pagination from '../components/Pagination.vue';
import { useDebounced } from '../composables/useDebounced';

const route = useRoute();
const router = useRouter();

// Filter state lives in the URL so views are shareable / back-button friendly.
const search = ref(String(route.query.q ?? ''));
const debouncedSearch = useDebounced(search, 300);
const status = computed(() => String(route.query.status ?? ''));
const tag = computed(() => String(route.query.tag ?? ''));
const page = computed(() => Number(route.query.page ?? 1));

const data = ref<Page<Article> | null>(null);
const loading = ref(false);
const error = ref('');

function setQuery(patch: Record<string, string | number | undefined>) {
  const query = { ...route.query, ...patch } as Record<string, string>;
  for (const k of Object.keys(query)) if (query[k] === undefined || query[k] === '') delete query[k];
  router.replace({ query });
}

watch(debouncedSearch, (q) => setQuery({ q, page: 1 }));

watch(
  () => route.query,
  async () => {
    loading.value = true;
    error.value = '';
    try {
      data.value = await api.list({
        q: String(route.query.q ?? ''),
        status: status.value as never,
        tag: tag.value,
        page: page.value,
        pageSize: 10,
      });
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <h1>Articles</h1>
  <div class="card row">
    <input v-model="search" data-testid="search-input" type="search" placeholder="Search title, tags, body…" aria-label="Search" />
    <select :value="status" data-testid="status-filter" aria-label="Status filter" @change="setQuery({ status: ($event.target as HTMLSelectElement).value, page: 1 })">
      <option value="">All statuses</option>
      <option v-for="s in STATUSES" :key="s" :value="s">{{ s.replace('_', ' ') }}</option>
    </select>
    <span v-if="tag" class="tag">tag: {{ tag }} <a href="#" @click.prevent="setQuery({ tag: undefined, page: 1 })">×</a></span>
  </div>

  <p v-if="error" class="error" data-testid="list-error">{{ error }}</p>
  <div class="card">
    <p v-if="loading && !data">Loading…</p>
    <table data-testid="article-table" v-else-if="data && data.items.length">
      <thead><tr><th>Title</th><th>Status</th><th>Brand</th><th>Author</th><th>Updated</th></tr></thead>
      <tbody>
        <tr v-for="a in data.items" :key="a.id" data-testid="article-row">
          <td><RouterLink data-testid="article-link" :to="`/articles/${a.id}`">{{ a.title }}</RouterLink>
            <div><span v-for="t in a.tags" :key="t" class="tag">{{ t }}</span></div></td>
          <td><StatusBadge :status="a.status" /></td>
          <td>{{ a.brand }}</td>
          <td>{{ a.author }}</td>
          <td class="muted">{{ new Date(a.updatedAt).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else data-testid="empty-state">No articles match.</p>
  </div>
  <div class="row" v-if="data">
    <Pagination :page="data.page" :total-pages="data.totalPages" @change="(p) => setQuery({ page: p })" />
    <span class="muted" data-testid="result-count">{{ data.total }} result(s)</span>
  </div>
</template>
