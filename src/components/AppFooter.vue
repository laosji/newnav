<template>
  <footer class="app-footer">
    <div class="footer-links">
      <a
        v-for="category in categories"
        :key="category.key"
        href="#"
        @click.prevent="$emit('category-change', category.key)"
      >
        {{ category.name }}
      </a>
    </div>
    <div class="copyright">
      &copy; 2024 导航网站. All Rights Reserved.
    </div>
  </footer>
</template>

<script setup>
defineProps({
  categories: Array
})
defineEmits(['category-change'])
</script>

<style scoped>
.app-footer {
  padding: 2rem 1rem;
  background-color: #343a40;
  color: white;
  text-align: center;
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.footer-links a {
  color: #adb5bd;
  text-decoration: none;
}
.footer-links a:hover {
  color: white;
}
</style>