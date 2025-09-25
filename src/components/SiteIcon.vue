<template>
  <div class="icon-container" :class="`icon-${size}`">
    <img
      v-if="isImageUrl"
      :src="icon"
      :alt="`${name} icon`"
      class="site-icon-configured"
      :class="`icon-${size}`"
      @load="onImageLoad"
      @error="onImageError"
      v-show="imageLoaded"
    >
    <span
      v-else-if="isEmoji"
      class="site-emoji"
      :class="`icon-${size}`"
    >
      {{ icon }}
    </span>
    <div
      v-if="isLoading"
      class="icon-loading"
      :class="`icon-${size}`"
    ></div>
    <div
      v-if="imageError"
      class="icon-fallback"
      :class="`icon-${size}`"
    >
      {{ fallbackInitial }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'default' // 'default' or 'small'
  }
})

const imageLoaded = ref(false)
const imageError = ref(false)
const isLoading = ref(false)

const isImageUrl = computed(() => {
  return props.icon && (props.icon.startsWith('http') || props.icon.startsWith('/'))
})

const isEmoji = computed(() => {
  // A simple regex to check for common emoji characters
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/
  return emojiRegex.test(props.icon)
})

const fallbackInitial = computed(() => {
  return props.name ? props.name.charAt(0).toUpperCase() : '?'
})

function onImageLoad() {
  isLoading.value = false
  imageLoaded.value = true
  imageError.value = false
}

function onImageError() {
  isLoading.value = false
  imageLoaded.value = false
  imageError.value = true
}

if (isImageUrl.value) {
  isLoading.value = true
}
</script>