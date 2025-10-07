<template>
  <div class="banpickbar">
    <div class="boxes" :class="{ wide: count > 9 }">
      <div
        v-for="i in count"
        :key="i"
        class="box"
        :class="{ empty: !images[i-1] }"
        :style="images[i-1] ? { backgroundImage: `url(${images[i-1]})` } : {}"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'BanPickBar' });

const props = defineProps<{
  count: number
  images: string[]
}>();

const count = computed(() => Math.max(0, Number(props.count) || 0));
const images = computed(() => props.images || []);
</script>

<style scoped>
.banpickbar {
  padding: 12px 16px;
  
}

.boxes {
  display: grid;
  grid-template-columns: repeat(9, 72px); /* 每行 9 个 */
  gap: 10px;
}

.boxes.wide {
  /* 17 个时自动换到第二行（9 + 8） */
}

.box {
  width: 72px;
  height: 72px;
  background: #f0f0f0 center/cover no-repeat;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
}

.box.empty {
  background: repeating-linear-gradient(45deg, #fafafa, #fafafa 6px, #f1f1f1 6px, #f1f1f1 12px);
}
</style>