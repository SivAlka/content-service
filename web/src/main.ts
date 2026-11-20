import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/articles', name: 'articles', component: () => import('./views/ArticleListView.vue') },
    { path: '/articles/new', name: 'new', component: () => import('./views/ArticleEditView.vue') },
    { path: '/articles/:id', name: 'edit', component: () => import('./views/ArticleEditView.vue'), props: true },
  ],
});

createApp(App).use(router).mount('#app');
