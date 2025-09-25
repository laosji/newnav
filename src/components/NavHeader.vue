<template>
  <header class="nav-header">
    <div class="logo">
      <a href="/">导航网站</a>
    </div>
    <div class="search-bar">
      <input
        type="text"
        placeholder="搜索网站..."
        :value="searchQuery"
        @input="$emit('search', $event.target.value)"
      />
    </div>
  </header>
</template>

<script setup>
defineProps({
  searchQuery: String
})
defineEmits(['search'])
</script>

<style scoped>
.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}
.logo a {
  font-weight: bold;
  font-size: 1.5rem;
  text-decoration: none;
  color: #333;
}
.search-bar input {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 250px;
}
</style>