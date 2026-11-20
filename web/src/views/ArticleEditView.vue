<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError } from '../api/client';
import type { Article, Revision, Status } from '../types';
import StatusBadge from '../components/StatusBadge.vue';

const props = defineProps<{ id?: string }>();
const router = useRouter();

const article = ref<Article | null>(null);
const revisions = ref<Revision[]>([]);
const form = ref({ title: '', body: '', tags: '', brand: 'allrecipes', author: '' });
const publishAt = ref('');
const error = ref('');
const problems = ref<string[]>([]);
const conflict = ref<Article | null>(null);
const saving = ref(false);

const isNew = computed(() => !props.id);

const NEXT: Record<Status, Status[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'approved'],
  approved: ['draft', 'scheduled', 'published'],
  scheduled: ['approved', 'published'],
  published: ['archived'],
  archived: ['draft'],
};

function load(a: Article) {
  article.value = a;
  form.value = { ...form.value, title: a.title, body: a.body, tags: a.tags.join(', '), brand: a.brand, author: a.author };
}

// Route 'new' -> 'edit' reuses this component instance, so react to id changes instead of onMounted.
watch(
  () => props.id,
  async (id) => {
    if (!id || article.value?.id === id) return;
    try {
      load(await api.get(id));
      revisions.value = await api.revisions(id);
    } catch (e) {
      error.value = (e as Error).message;
    }
  },
  { immediate: true },
);

const parseTags = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);

function handle(e: unknown) {
  problems.value = [];
  if (e instanceof ApiError) {
    if (e.status === 409 && e.code === 'conflict') {
      conflict.value = e.details.current as Article;
      error.value = 'Someone else changed this article while you were editing.';
      return;
    }
    if (e.code === 'guard_failed') problems.value = e.details.problems;
    error.value = e.message;
  } else error.value = (e as Error).message;
}

async function save() {
  saving.value = true;
  error.value = '';
  conflict.value = null;
  try {
    if (isNew.value) {
      const created = await api.create({ ...form.value, tags: parseTags(form.value.tags) });
      router.replace(`/articles/${created.id}`);
      return;
    }
    const a = article.value!;
    load(await api.update(a.id, a.version, { title: form.value.title, body: form.value.body, tags: parseTags(form.value.tags) }));
    revisions.value = await api.revisions(a.id);
  } catch (e) {
    handle(e);
  } finally {
    saving.value = false;
  }
}

async function move(to: Status) {
  error.value = '';
  problems.value = [];
  try {
    const a = article.value!;
    load(await api.transition(a.id, a.version, to, to === 'scheduled' ? new Date(publishAt.value).toISOString() : undefined));
  } catch (e) {
    handle(e);
  }
}

async function restore(rev: number) {
  try {
    const a = article.value!;
    load(await api.restore(a.id, a.version, rev));
    revisions.value = await api.revisions(a.id);
  } catch (e) {
    handle(e);
  }
}

function takeTheirs() {
  load(conflict.value!);
  conflict.value = null;
  error.value = '';
}
</script>

<template>
  <h1>{{ isNew ? 'New article' : 'Edit article' }}</h1>
  <p v-if="error" class="error" role="alert" data-testid="error-alert">
    {{ error }}
    <ul v-if="problems.length" data-testid="guard-problems"><li v-for="p in problems" :key="p">{{ p }}</li></ul>
    <button v-if="conflict" data-testid="discard-and-reload" class="btn" @click="takeTheirs">Discard my changes and load latest (v{{ conflict.version }})</button>
  </p>

  <form class="card" @submit.prevent="save">
    <label for="title">Title</label>
    <input id="title" data-testid="title-input" v-model="form.title" required minlength="3" style="width: 100%" />
    <div class="row">
      <div><label for="brand">Brand</label><input id="brand" data-testid="brand-input" v-model="form.brand" :disabled="!isNew" /></div>
      <div><label for="author">Author</label><input id="author" data-testid="author-input" v-model="form.author" :disabled="!isNew" required /></div>
    </div>
    <label for="tags">Tags (comma separated)</label>
    <input id="tags" data-testid="tags-input" v-model="form.tags" style="width: 100%" />
    <label for="body">Body</label>
    <textarea id="body" data-testid="body-input" v-model="form.body" />
    <div class="row" style="margin-top: 1rem">
      <button class="btn primary" data-testid="save-button" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      <span v-if="article" class="muted" data-testid="version-label">v{{ article.version }} · <StatusBadge :status="article.status" /></span>
    </div>
  </form>

  <div v-if="article" class="card">
    <h3>Workflow</h3>
    <div class="row">
      <input v-if="NEXT[article.status].includes('scheduled')" data-testid="publish-at-input" v-model="publishAt" type="datetime-local" aria-label="Publish at" />
      <button v-for="s in NEXT[article.status]" :key="s" class="btn" :data-testid="`transition-${s}`" @click="move(s)">→ {{ s.replace('_', ' ') }}</button>
    </div>
    <p v-if="article.publishAt" class="muted" data-testid="publish-at-label">Scheduled for {{ new Date(article.publishAt).toLocaleString() }}</p>
  </div>

  <div v-if="revisions.length" class="card">
    <h3>Revisions</h3>
    <table>
      <tbody>
        <tr v-for="r in revisions" :key="r.revision" data-testid="revision-row">
          <td>#{{ r.revision }}</td>
          <td>{{ r.title }}<div class="muted">{{ r.note }}</div></td>
          <td class="muted">{{ new Date(r.savedAt).toLocaleString() }}</td>
          <td><button class="btn" :data-testid="`restore-${r.revision}`" @click="restore(r.revision)">Restore</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
