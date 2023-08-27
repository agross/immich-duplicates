<template>
  <span class="key">
    <slot />
  </span>
</template>

<style scoped>
.key {
  border: 1px solid greenyellow;
  padding: 0.2rem;
  border-radius: 2px;
  font-family: monospace
}

:disabled .key {
  border: 1px solid var(--color-background);
}
</style>
