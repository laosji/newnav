<template>
  <a :href="site.url" target="_blank" class="category-card">
    <div class="card-icon">
      <SiteIcon :icon="site.icon" :name="site.name" />
    </div>
    <div class="card-content">
      <h3 class="card-title">{{ site.name }}</h3>
      <p class="card-desc">{{ site.description }}</p>
    </div>
  </a>
</template>

<script setup>
import SiteIcon from './SiteIcon.vue'

defineProps({
  site: {
    type: Object,
    required: true
  }
})
</script>