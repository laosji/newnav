<template>
  <nav class="category-filter">
    <ul>
      <li v-for="category in categories" :key="category.key">
        <a
          href="#"
          :class="{ active: currentCategory === category.key }"
          @click.prevent="$emit('category-change', category.key)"
        >
          {{ category.icon }} {{ category.name }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
defineProps({
  currentCategory: String,
  categories: Array
})
defineEmits(['category-change'])
</script>

<style scoped>
.category-filter {
  padding: 1rem 0;
  background-color: #fff;
}
.category-filter ul {
  display: flex;
  justify-content: center;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 1rem;
}
.category-filter a {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  text-decoration: none;
  color: #555;
  background-color: #f1f3f5;
  transition: all 0.2s;
}
.category-filter a.active,
.category-filter a:hover {
  background-color: #007bff;
  color: white;
}
</style>