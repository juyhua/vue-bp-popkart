<template>
  <div class="link-view">
    <h2>房间链接生成</h2>
    <div v-for="(link, idx) in links" :key="idx" class="link-row">
      <span>{{ link.label }}：</span>
      <input :value="link.url" readonly />
      <button @click="copy(link.url)">复制</button>
    </div>

    <button class="enter-btn" @click="enterRoom">裁判进入房间（当前页跳转）</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const teamA = (route.query.teamA as string) || '';
const teamB = (route.query.teamB as string) || '';
const matchTime = (route.query.matchTime as string) || '';
const boMode = (route.query.boMode as string) || '';
const matchMode = (route.query.matchMode as string) || '';

// code 作为房间号（如果外部未传，则生成一个）
const code = (route.query.code as string) || Math.random().toString(36).substring(2, 10).toUpperCase();

// 生成指向 mainView 的链接（包含所有参数，使用 hash 路由安全）
function buildMainUrl(team: 'blue' | 'red' | 'referee') {
  const r = router.resolve({
    name: 'main',
    query: { teamA, teamB, matchTime, boMode, matchMode, code, team }
  });
  return `${window.location.origin}/${r.href}`;
}

const links = computed(() => [
  { label: 'A队选手', url: buildMainUrl('blue') },
  { label: 'B队选手', url: buildMainUrl('red') },
  { label: '裁判',   url: buildMainUrl('referee') }
]);

function copy(text: string) {
  navigator.clipboard.writeText(text);
}

function enterRoom() {
  // 默认以裁判身份在当前页进入 mainView
  router.push({
    name: 'main',
    query: { teamA, teamB, matchTime, boMode, matchMode, code, team: 'referee' }
  });
}
</script>

<style scoped>
.link-view {
  max-width: 500px;
  margin: 80px auto;
  padding: 32px;
  background: #AAA;
  border-radius: 16px;
}
.link-row {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}
.link-row button:hover {
  background: #3076c9;
}
.enter-btn {
  width: 100%;
  text-align: center;
  padding: 12px;
  background: #67c23a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  margin-top: 12px;
}
.enter-btn:hover {
  background: #4cae1c;
}
</style>
