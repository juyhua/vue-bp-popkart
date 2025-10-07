<template>
    <div class="team-track-container">
        <h2 class="pool-title">地图池</h2>
        <div class="team-track-grid">
            <div v-for="(imga, idx) in teamTrackImages" :key="idx" class="team-track-item">
                <img :src="imga" alt="Team Track" @click="onSelect(imga)" />
            </div>
        </div>
    </div>
    </template>


<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useMappoolStore } from '@/stores/mappool';

const emit = defineEmits<{
  (e: 'select', url: string): void
}>()

const mappoolStore = useMappoolStore();

onMounted(() => {
    // 替换为你的 WebSocket 服务地址
    mappoolStore.connectWebSocket('ws://localhost:8080');
});

// 将任意传入路径标准化为后端 /static 可访问的 URL
const toStaticUrl = (p: string) => {
    if (!p) return p as unknown as string;
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/static/')) return p;
    // 去掉 '@/assets/' 或开头的斜杠，拼接到 /static 下
    const cleaned = p.replace(/^@\/assets\/?/, '').replace(/^\/?/, '');
    return `/static/${cleaned}`;
};

const teamTrackImages = computed(() => {
    // mappool.value 为图片路径数组
    if (mappoolStore.mappool.length > 0) {
        return mappoolStore.mappool.map(toStaticUrl);
    }
    // 默认使用后端静态路径
    return [
        '/static/TeamTrack/01.Olympus_Temple.jpg',
        '/static/TeamTrack/02.ArthurLegend_PatrolRoad.jpg',
        '/static/TeamTrack/03.Abyssal_Whirlpool.jpg',
        '/static/TeamTrack/04.Sword_CloudCanyon.jpg',
        '/static/TeamTrack/05.Square_SteelFurnace.jpg',
        '/static/TeamTrack/06.Square_SantaSecretSpace.jpg',
        '/static/TeamTrack/07.World_New YorkCity.jpg',
        '/static/TeamTrack/08.Jurassic_DinosaurArena.jpg',
        '/static/TeamTrack/09.Beach_BeachDrive.jpg',
        '/static/TeamTrack/10.WKC_TouringRally.jpg',
        '/static/TeamTrack/11.China_Terracotta.jpg',
        '/static/TeamTrack/12.GoldenCivilization_GoldenCoordinates.jpg',
        '/static/TeamTrack/13.MoonhillCity_HiddenUndergroundTunnel.jpg',
        '/static/TeamTrack/14.FairyTale_TheSleepingGiant.jpg',
        '/static/TeamTrack/15.Space_CombatAirfield.png',
        '/static/TeamTrack/16.Tomb_SkeletonAdventure.png',
        '/static/TeamTrack/17.Ice_HelicopterJump.jpg',
        '/static/TeamTrack/18.Village_GreatWall.jpg',
        '/static/TeamTrack/19.Desert_RotatingConstruction[R].jpg',
        '/static/TeamTrack/20.Forest_Zigzag.jpg',
    ];
});

function onSelect(url: string) {
  emit('select', url);
}
</script>




<style scoped>
.team-track-container {
    width: 1000px;
    height: 400px;
    margin: 40px auto;
    display: block; /* 顶部对齐显示内容 */
    overflow-y: auto;
    background: #d6dbd7f6;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pool-title {
    margin: 16px 24px 0 24px;
}

.team-track-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    padding: 16px 24px 24px 24px; /* 与标题间距更紧凑 */
    width: 100%;
    align-content: start; /* 网格在容器内从顶部开始排列 */
}

.team-track-item img {
    width: 150px;
    height: 150px;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    background: #fff;
}
</style>
