<template>
	<div class="title-bar">
		<div class="center-buttons">
			<button class="title-btn">第一局</button>
			<p class="title-btn">{{ displayBo }}</p>
			<button class="title-btn">第二局</button>
		</div>
		<div class="right-btn">
			<button class="title-btn">回档</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// 接收来自父组件/页面传入的赛制参数，如 "BO5" 或 "BO9"
const props = defineProps<{ boMode?: string }>();

// 规范化展示，若传入为 "5" 则显示为 "BO5"；若已是 "BO5/BO9" 则统一大写展示
const displayBo = computed(() => {
	const val = (props.boMode || '').toString().trim();
	if (!val) return '';
	const upper = val.toUpperCase();
	return upper.startsWith('BO') ? upper : `BO${upper}`;
});
</script>

<style scoped>
.title-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	height: 56px;
	background: #f7f7fa;
	border-bottom: 1px solid #e0e0e0;
}
.center-buttons {
	display: flex;
	gap: 32px;
	margin: 0 auto;
}
.right-btn {
	position: absolute;
	right: 32px;
	top: 0;
	height: 100%;
	display: flex;
	align-items: center;
}
.title-btn {
	padding: 8px 24px;
	font-size: 18px;
	background: #fff;
	border: 1px solid #d0d0d0;
	border-radius: 8px;
	cursor: pointer;
	transition: box-shadow 0.2s;
}
.title-btn:hover {
	box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
</style>
