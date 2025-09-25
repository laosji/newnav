<template>
  <div class="quick-access">
    <h3>快速访问</h3>
    <div class="quick-links">
      <a v-for="site in sites" :key="site.name" :href="site.url" target="_blank" class="quick-link">
        {{ site.icon }} {{ site.name }}
      </a>
    </div>
  </div>
</template>

<script setup>
defineProps({
  sites: Array
})
</script>

<style scoped>
.quick-access {
  padding: 1rem;
  background-color: #f8f9fa;
  text-align: center;
}
.quick-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.quick-link {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  text-decoration: none;
  color: #555;
  background-color: #e9ecef;
  transition: background-color 0.2s;
}
.quick-link:hover {
  background-color: #dee2e6;
}
</style>