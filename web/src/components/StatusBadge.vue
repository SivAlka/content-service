<script setup lang="ts">
import type { Status } from '../types';
defineProps<{ status: Status }>();
</script>
<template>
  <span class="badge" :class="status">{{ status.replace('_', ' ') }}</span>
</template>
