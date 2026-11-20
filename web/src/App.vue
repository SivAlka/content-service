<template>
  <header class="topbar">
    <strong>Content Service</strong>
    <nav>
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/articles">Articles</RouterLink>
      <RouterLink to="/articles/new" class="btn primary">New article</RouterLink>
    </nav>
  </header>
  <main><RouterView /></main>
</template>
