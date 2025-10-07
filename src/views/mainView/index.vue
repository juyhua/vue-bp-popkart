<template>
    <div class="Main">
        <div class="title">
            <!-- Inline Title -->
            <div class="title-bar">
                <div class="left-info">
                    <span class="status-text">比赛状态：{{ started ? '进行中' : '未开始' }}</span>
                    <span class="presence-group">已入房：
                        <span class="presence-pill" :class="{ on: presentRef }">裁判</span>
                        <span class="presence-pill" :class="{ on: presentBlue }">A</span>
                        <span class="presence-pill" :class="{ on: presentRed }">B</span>
                    </span>
                </div>
                <div class="center-buttons">
                    <p class="title-btn">赛制：{{ displayBo }}</p>
                    <button class="title-btn" :class="{ active: currentRound === 1 }" @click="switchRound(1)">第一局</button>
                    <button class="title-btn" :class="{ active: currentRound === 2 }" @click="switchRound(2)">第二局</button>
                </div>
                <div class="right-btn" v-if="team === 'referee'">
                    <button class="title-btn" @click="rollbackLast">回档</button>
                </div>
            </div>
        </div>

        <!-- Inline Mappool -->
        <div class="mappool">
            <div class="mappool-header">
                <div class="team-name left">A队名称：{{ teamA }}</div>
                <span>A队就绪：{{ readyA ? '是' : '否' }}</span>
                
                
                <span>B队就绪：{{ readyB ? '是' : '否' }}</span>
                <div class="team-name right">B队名称：{{ teamB }}</div>
            </div>

            <div class="team-track-container">
                <h2 class="pool-title">地图池</h2>
                <div class="team-track-grid">
                    <div v-for="(imga, idx) in visibleTrackImages" :key="idx" class="team-track-item">
                        <img :src="imga" alt="Team Track" @click="onSelectMap(imga)" :class="{ disabled: isUsed(imga) }" />
                    </div>
                </div>
                <div v-if="countingDown" class="countdown-overlay">{{ remaining }} 秒</div>
            </div>
        </div>

        <!-- Inline BanPickBar (BAN 灰，PICK 彩色，展示 A/B 与 BAN/PICK 标签) -->
        <div class="banpickbar">
            <div class="boxes" :class="{ wide: boxCount > 9 }">
                <div v-for="(entry, i) in barEntriesLimited" :key="i"
                     class="box"
                     :class="{ empty: !entry, ban: entry && entry.action === 'ban' }"
                     :style="entry ? { backgroundImage: `url(${entry.url})` } : {}">
                    <span class="box-label"
                          :class="{
                            ban: stepAction(i) === 'ban',
                            teamA: stepTeamLetter(i) === 'A',
                            teamB: stepTeamLetter(i) === 'B',
                            empty: !entry
                          }">
                        {{ stepLabel(i) }}
                    </span>
                </div>
            </div>
        </div>

        <div class="controls">
            <div class="status"></div>
            <div class="buttons">
                <button class="action-btn" @click="toggleReady" :disabled="started">
                    {{ isReadySelf ? '取消就绪' : '准备就绪' }}（当前身份：{{ teamLabel }}）
                </button>
                <button class="action-btn primary" @click="startMatch" :disabled="!canStart">开始比赛（裁判）</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { io, Socket } from 'socket.io-client';
import { useMappoolStore } from '@/stores/mappool';

const route = useRoute();
const teamA = route.query.teamA as string || '';
const teamB = route.query.teamB as string || '';
const matchTime = route.query.matchTime as string || '';
const boMode = route.query.boMode as string || '';

const code = route.query.code as string || '';
// Normalize team: support 'A'/'B' and 'blue'/'red'
const teamParam = ((route.query.team as string) || '').toString().trim().toLowerCase()
const team = teamParam === 'blue' || teamParam === 'a'
  ? 'blue'
  : teamParam === 'red' || teamParam === 'b'
  ? 'red'
  : 'referee'



let socket: Socket | null = null;

// 本地 UI 状态
const readyA = ref(false)
const readyB = ref(false)
const started = ref(false)
// presence: require blue/red/referee all present
const presentBlue = ref(false)
const presentRed = ref(false)
const presentRef = ref(false)
const presenceAll = computed(() => presentBlue.value && presentRed.value && presentRef.value)

const isReadySelf = computed(() => (team === 'blue' ? readyA.value : team === 'red' ? readyB.value : (readyA.value && readyB.value)))
const canStart = computed(() => team === 'referee' && readyA.value && readyB.value && !started.value && presenceAll.value)
const teamLabel = computed(() => team === 'blue' ? 'A队' : team === 'red' ? 'B队' : '裁判')

// 当前显示的局数（1 或 2）
const currentRound = ref<1 | 2>(1)

// Round 1 / Round 2 独立状态
const r1Selected = ref<string[]>([])
const r1Used = ref<string[]>([])
const r1Entries = ref<BarEntry[]>([])
const r2Selected = ref<string[]>([])
const r2Used = ref<string[]>([])
const r2Entries = ref<BarEntry[]>([])

// 绑定到 UI 的当前局可变状态（通过 switchRound 同步）
const selectedImages = ref<string[]>([])
const usedUrls = ref<string[]>([])
const countingDown = ref(false)
const remaining = ref(0)
let countdownTimer: number | null = null
const normBo = computed(() => {
    const val = (boMode || '').toString().trim().toUpperCase()
    return val.startsWith('BO') ? val : (val ? `BO${val}` : '')
})

const barEntriesLimited = computed(() => {
    const limit = Number(boxCount.value) || 0
    const list = barEntries.value.slice(0, limit)
    // pad to fixed length for consistent grid
    return list.concat(Array(Math.max(0, limit - list.length)).fill(null)) as (BarEntry | null)[]
})

// 显示标签辅助：A/B 与 BAN/PICK
function stepTeamLetter(index: number): 'A' | 'B' {
    const t = bpSteps.value[index]?.team
    return t === 'red' ? 'B' : 'A'
}
function stepAction(index: number): 'ban' | 'pick' {
    const a = bpSteps.value[index]?.action
    return a === 'ban' ? 'ban' : 'pick'
}
function stepLabel(index: number): string {
    return `${stepTeamLetter(index)} ${stepAction(index).toUpperCase()}`
}
const boxCount = computed(() => normBo.value === 'BO9' ? 17 : 9)

//标题展示
const displayBo = computed(() => normBo.value)

// Mappool 数据与展示
const mappoolStore = useMappoolStore();
const overrideImages = ref<string[]>([])
type BarEntry = { url: string; action: 'ban' | 'pick' }
const barEntries = ref<BarEntry[]>([])
const toStaticUrl = (p: string) => {
    if (!p) return p as unknown as string
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/static/')) return p
    const cleaned = p.replace(/^@\/assets\/?/, '').replace(/^\/?/, '')
    return `/static/${cleaned}`
}

function rollbackLast() {
  if (!selectedImages.value.length) return
  // 广播回档到所有端
  emitRoomEvent({ type: 'rollback', by: team, round: currentRound.value })
  applyRollback()
}
const teamTrackImages = computed(() => {
    if (overrideImages.value.length > 0) return overrideImages.value
    // 如果后端/存储有提供地图池，优先使用（保持原有路径规则）
    if (mappoolStore.mappool.length > 0) {
        return mappoolStore.mappool.map(toStaticUrl)
    }
    const names = [
        '01.Olympus_Temple.jpg',
        '02.ArthurLegend_PatrolRoad.jpg',
        '03.Abyssal_Whirlpool.jpg',
        '04.Sword_CloudCanyon.jpg',
        '05.Square_SteelFurnace.jpg',
        '06.Square_SantaSecretSpace.jpg',
        '07.World_New YorkCity.jpg',
        '08.Jurassic_DinosaurArena.jpg',
        '09.Beach_BeachDrive.jpg',
        '10.WKC_TouringRally.jpg',
        '11.China_Terracotta.jpg',
        '12.GoldenCivilization_GoldenCoordinates.jpg',
        '13.MoonhillCity_HiddenUndergroundTunnel.jpg',
        '14.FairyTale_TheSleepingGiant.jpg',
        '15.Space_CombatAirfield.png',
        '16.Tomb_SkeletonAdventure.png',
        '17.Ice_HelicopterJump.jpg',
        '18.Village_GreatWall.jpg',
        '20.Forest_Zigzag.jpg',
    ]
    return names.map(n => `/static/TeamTrack/${n}`)
})

// Round 2 需要隐藏 Round 1 使用过的地图（仅 BO5 全局 BP；BO9 不共享）
const visibleTrackImages = computed(() => {
    if (currentRound.value === 2 && normBo.value !== 'BO9') {
        const hidden = new Set(r1Used.value)
        return teamTrackImages.value.filter(u => !hidden.has(u))
    }
    return teamTrackImages.value
})

async function loadDefaultIndex() {
    try {
        const res = await fetch(`/static/TeamTrack/index.json`, { cache: 'no-cache' })
        if (!res.ok) return
        const list = await res.json()
        if (Array.isArray(list) && list.length) {
            overrideImages.value = list.map((n: string) => `/static/TeamTrack/${n}`)
        }
    } catch (e) {
        // 忽略错误，使用内置默认列表
        console.warn('loadDefaultIndex failed:', e)
    }
}

function onSelectMap(url: string) {
  // 已使用或超出数量则忽略
  if (isUsed(url)) return
  if (barEntries.value.length >= boxCount.value) return
  // 未开始或倒计时期间禁止选图
  if (!started.value) return
  if (countingDown.value) return
  // 等待三人都进入房间
  if (!presenceAll.value) return

  // 回合与阵营限制（需要当前阵营操作）
  if (!['blue', 'red', 'referee'].includes(team)) return
  const needTeam = currentTeamTurn.value
  if (team !== 'referee' && team !== needTeam) return

  // 二次确认
  if (!window.confirm('确认选择该赛道？')) return

  const phase = currentPhase.value
  // 本地立即应用（避免等待回显）
  if (phase === 'ban') {
    if (!usedUrls.value.includes(url)) usedUrls.value.push(url)
  } else {
    if (!selectedImages.value.includes(url)) selectedImages.value.push(url)
    if (!usedUrls.value.includes(url)) usedUrls.value.push(url)
  }
  const entry = { url, action: phase === 'ban' ? 'ban' : 'pick' } as BarEntry
  barEntries.value.push(entry)
  if (currentRound.value === 1) r1Entries.value.push(entry)
  else r2Entries.value.push(entry)

  // 同步到对应轮的 used/selected（本端不接收自身 echo，因此需本地就地维护）
  if (currentRound.value === 1) {
    if (phase === 'ban') {
      if (!r1Used.value.includes(url)) r1Used.value.push(url)
    } else {
      if (!r1Used.value.includes(url)) r1Used.value.push(url)
      if (!r1Selected.value.includes(url)) r1Selected.value.push(url)
    }
  } else {
    if (phase === 'ban') {
      if (!r2Used.value.includes(url)) r2Used.value.push(url)
    } else {
      if (!r2Used.value.includes(url)) r2Used.value.push(url)
      if (!r2Selected.value.includes(url)) r2Selected.value.push(url)
    }
  }

  // 广播本次选择到房间
  emitRoomEvent({ type: 'select', url, by: team, action: phase, round: currentRound.value })
}

function isUsed(url: string) {
  return usedUrls.value.includes(url)
}

function applyPick(url: string) {
  if (!usedUrls.value.includes(url)) usedUrls.value.push(url)
  if (!selectedImages.value.includes(url) && selectedImages.value.length < boxCount.value) selectedImages.value.push(url)
  if (currentRound.value === 1) {
    if (!r1Used.value.includes(url)) r1Used.value.push(url)
    if (!r1Selected.value.includes(url)) r1Selected.value.push(url)
  } else {
    if (!r2Used.value.includes(url)) r2Used.value.push(url)
    if (!r2Selected.value.includes(url)) r2Selected.value.push(url)
  }
}

function applyBan(url: string) {
  if (!usedUrls.value.includes(url)) usedUrls.value.push(url)
  if (currentRound.value === 1) {
    if (!r1Used.value.includes(url)) r1Used.value.push(url)
  } else {
    if (!r2Used.value.includes(url)) r2Used.value.push(url)
  }
}

function applyRollback() {
  const last = barEntries.value.pop()
  if (!last) return
  const { url, action } = last
  const idxUsed = usedUrls.value.lastIndexOf(url)
  if (idxUsed >= 0) usedUrls.value.splice(idxUsed, 1)
  if (action === 'pick') {
    const idxSel = selectedImages.value.lastIndexOf(url)
    if (idxSel >= 0) selectedImages.value.splice(idxSel, 1)
  }
  // 同步到当前局存储
  const arrEntries = currentRound.value === 1 ? r1Entries.value : r2Entries.value
  const arrUsed = currentRound.value === 1 ? r1Used.value : r2Used.value
  const arrSel = currentRound.value === 1 ? r1Selected.value : r2Selected.value
  const be = arrEntries.pop()
  if (be) {
    const iu = arrUsed.lastIndexOf(be.url)
    if (iu >= 0) arrUsed.splice(iu, 1)
    if (be.action === 'pick') {
      const is = arrSel.lastIndexOf(be.url)
      if (is >= 0) arrSel.splice(is, 1)
    }
  }
}

// 切换局：同步当前 UI 状态到对应轮的数据
function switchRound(r: 1 | 2) {
  currentRound.value = r
  if (r === 1) {
    selectedImages.value = [...r1Selected.value]
    usedUrls.value = [...r1Used.value]
    barEntries.value = [...r1Entries.value]
  } else {
    selectedImages.value = [...r2Selected.value]
    usedUrls.value = [...r2Used.value]
    barEntries.value = [...r2Entries.value]
  }
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startLocalCountdown(seconds: number) {
  clearCountdown()
  countingDown.value = true
  remaining.value = Math.max(0, Number(seconds) || 0)
  countdownTimer = setInterval(() => {
    if (remaining.value > 0) {
      remaining.value -= 1
    } else {
      clearCountdown()
      countingDown.value = false
    }
  }, 1000) as unknown as number
}

// 房间事件与按钮功能
function emitRoomEvent(payload: any) {
    socket?.emit('roomEvent', payload)
}

// BAN/PICK 顺序（9步）: 1.A BAN 2.B BAN 3.B PICK 4.A PICK 5.B BAN 6.A BAN 7.A PICK 8.B PICK 9.A PICK
// Round 1 顺序
const bpStepsR1 = [
  { action: 'ban', team: 'blue' },
  { action: 'ban', team: 'red' },
  { action: 'pick', team: 'red' },
  { action: 'pick', team: 'blue' },
  { action: 'ban', team: 'red' },
  { action: 'ban', team: 'blue' },
  { action: 'pick', team: 'blue' },
  { action: 'pick', team: 'red' },
  { action: 'pick', team: 'blue' },
] as const
// Round 2 顺序：1.B BAN 2.A BAN 3 A PICK 4 B PICK 5 A BAN 6 B BAN 7 B PICK 8 A PICK 9 B PICK
const bpStepsR2 = [
  { action: 'ban', team: 'red' },
  { action: 'ban', team: 'blue' },
  { action: 'pick', team: 'blue' },
  { action: 'pick', team: 'red' },
  { action: 'ban', team: 'blue' },
  { action: 'ban', team: 'red' },
  { action: 'pick', team: 'red' },
  { action: 'pick', team: 'blue' },
  { action: 'pick', team: 'red' },
] as const

// BO9 模式（不跨局共享 BanPick）下的 17 步顺序
// 第一局：
// 1 A BAN, 2 B BAN, 3 A PICK, 4 B PICK, 5 A BAN, 6 B BAN, 7 B BAN, 8 A BAN,
// 9 B PICK, 10 A PICK, 11 A PICK, 12 B PICK, 13 B BAN, 14 A BAN, 15 A PICK, 16 B PICK, 17 A PICK
const bpStepsR1_BO9 = [
  { action: 'ban',  team: 'blue' }, // 1
  { action: 'ban',  team: 'red'  }, // 2
  { action: 'pick', team: 'blue' }, // 3
  { action: 'pick', team: 'red'  }, // 4
  { action: 'ban',  team: 'blue' }, // 5
  { action: 'ban',  team: 'red'  }, // 6
  { action: 'ban',  team: 'red'  }, // 7
  { action: 'ban',  team: 'blue' }, // 8
  { action: 'pick', team: 'red'  }, // 9
  { action: 'pick', team: 'blue' }, // 10
  { action: 'pick', team: 'blue' }, // 11
  { action: 'pick', team: 'red'  }, // 12
  { action: 'ban',  team: 'red'  }, // 13
  { action: 'ban',  team: 'blue' }, // 14
  { action: 'pick', team: 'blue' }, // 15
  { action: 'pick', team: 'red'  }, // 16
  { action: 'pick', team: 'blue' }, // 17
] as const

// 第二局：
// 1 B BAN, 2 A BAN, 3 B PICK, 4 A PICK, 5 B BAN, 6 A BAN, 7 A BAN, 8 B BAN,
// 9 A PICK, 10 B PICK, 11 B PICK, 12 A PICK, 13 A BAN, 14 B BAN, 15 B PICK, 16 A PICK, 17 B PICK
const bpStepsR2_BO9 = [
  { action: 'ban',  team: 'red'  }, // 1
  { action: 'ban',  team: 'blue' }, // 2
  { action: 'pick', team: 'red'  }, // 3
  { action: 'pick', team: 'blue' }, // 4
  { action: 'ban',  team: 'red'  }, // 5
  { action: 'ban',  team: 'blue' }, // 6
  { action: 'ban',  team: 'blue' }, // 7
  { action: 'ban',  team: 'red'  }, // 8
  { action: 'pick', team: 'blue' }, // 9
  { action: 'pick', team: 'red'  }, // 10
  { action: 'pick', team: 'red'  }, // 11
  { action: 'pick', team: 'blue' }, // 12
  { action: 'ban',  team: 'blue' }, // 13
  { action: 'ban',  team: 'red'  }, // 14
  { action: 'pick', team: 'red'  }, // 15
  { action: 'pick', team: 'blue' }, // 16
  { action: 'pick', team: 'red'  }, // 17
] as const

const bpSteps = computed(() => {
  if (normBo.value === 'BO9') {
    return currentRound.value === 2 ? bpStepsR2_BO9 : bpStepsR1_BO9
  }
  return currentRound.value === 2 ? bpStepsR2 : bpStepsR1
})
const currentStep = computed(() => Math.min(barEntries.value.length, bpSteps.value.length))
const currentPhase = computed(() => bpSteps.value[currentStep.value]?.action || 'pick')
const currentTeamTurn = computed(() => bpSteps.value[currentStep.value]?.team || 'blue')
const isBanPhase = computed(() => currentPhase.value === 'ban')

function toggleReady() {
    if (team === 'blue') {
        readyA.value = !readyA.value
        emitRoomEvent({ type: 'ready', team: 'blue', value: readyA.value })
    } else if (team === 'red') {
        readyB.value = !readyB.value
        emitRoomEvent({ type: 'ready', team: 'red', value: readyB.value })
    } else {
        const newVal = !(readyA.value && readyB.value)
        readyA.value = newVal
        readyB.value = newVal
        emitRoomEvent({ type: 'ready', team: 'blue', value: readyA.value })
        emitRoomEvent({ type: 'ready', team: 'red', value: readyB.value })
    }
}

function startMatch() {
    if (team === 'referee' && readyA.value && readyB.value && !started.value) {
        // 触发全员倒计时（由裁判发起）
        const duration = Math.max(0, Number(matchTime) || 0)
        emitRoomEvent({ type: 'countdownStart', durationSeconds: duration })
        startLocalCountdown(duration)
        // 立即进入开始状态，允许选图
        emitRoomEvent({ type: 'start' })
        started.value = true
    }
}

onMounted(() => {
    // 连接后端 Socket.IO 服务（与后端端口一致）
    socket = io('http://localhost:3001', { transports: ['websocket'] });

    socket.on('connect', () => {
        // 进入以 code 为房间号的房间（不再包含 matchMode）
        socket?.emit('joinRoom', { code, team, meta: { teamA, teamB, matchTime, boMode } });
    });

    // 接收房间内成员变化
    socket.on('presence', (payload: any) => {
        console.log('presence', payload);
        if (payload?.type === 'join') {
          if (payload.team === 'blue') presentBlue.value = true
          if (payload.team === 'red') presentRed.value = true
          if (payload.team === 'referee') presentRef.value = true
        }
        if (payload?.type === 'leave') {
          if (payload.team === 'blue') presentBlue.value = false
          if (payload.team === 'red') presentRed.value = false
          if (payload.team === 'referee') presentRef.value = false
        }
        // Note: leave events currently do not include team; we keep presence until refresh/rejoin
    });

    // acknowledge to self when joined; mark own role present
    socket.on('joined', (_info: any) => {
      if (team === 'blue') presentBlue.value = true
      else if (team === 'red') presentRed.value = true
      else if (team === 'referee') presentRef.value = true
    })

    // 初始状态同步（刷新时保留）
    socket.on('stateSync', (st: any) => {
        if (!st) return
        // 初始化存在的成员（让后进入的人看到已在房间的角色）
        if (st.members && typeof st.members === 'object') {
            presentBlue.value = !!st.members.blue
            presentRed.value = !!st.members.red
            presentRef.value = !!st.members.referee
        }
        // 新结构：按轮次同步
        if (st.rounds && st.rounds[1] && st.rounds[2]) {
            const r1 = st.rounds[1]
            const r2 = st.rounds[2]
            r1Entries.value = (Array.isArray(r1.timeline) ? r1.timeline : []).map((e: any) => ({ url: String(e.url), action: e.action === 'ban' ? 'ban' : 'pick' }))
            r1Selected.value = r1Entries.value.filter(e => e.action === 'pick').map(e => e.url)
            r1Used.value = Array.isArray(r1.used) ? [...r1.used] : []

            r2Entries.value = (Array.isArray(r2.timeline) ? r2.timeline : []).map((e: any) => ({ url: String(e.url), action: e.action === 'ban' ? 'ban' : 'pick' }))
            r2Selected.value = r2Entries.value.filter(e => e.action === 'pick').map(e => e.url)
            r2Used.value = Array.isArray(r2.used) ? [...r2.used] : []

            switchRound(currentRound.value)
        } else {
            // 兼容旧结构
            if (Array.isArray(st.timeline)) {
                barEntries.value = st.timeline.map((e: any) => ({ url: String(e.url), action: e.action === 'ban' ? 'ban' : 'pick' }))
                selectedImages.value = barEntries.value.filter(e => e.action === 'pick').map(e => e.url)
            } else if (Array.isArray(st.selected)) {
                selectedImages.value = [...st.selected]
                barEntries.value = selectedImages.value.map(url => ({ url, action: 'pick' }))
            }
            if (Array.isArray(st.used)) usedUrls.value = [...st.used]
        }
        // 就绪与开始状态
        if (typeof st.readyA === 'boolean') readyA.value = st.readyA
        if (typeof st.readyB === 'boolean') readyB.value = st.readyB
        if (typeof st.started === 'boolean') started.value = st.started
    })

    // 接收房间内状态事件
    socket.on('roomEvent', (payload: any) => {
        console.log('roomEvent', payload);
        if (!payload || !payload.type) return;
        if (payload.type === 'ready') {
          if (payload.team === 'blue') readyA.value = !!payload.value;
          if (payload.team === 'red') readyB.value = !!payload.value;
        }
        if (payload.type === 'start') {
          started.value = true;
          // 确保可立刻选图（即使曾经在倒计时）
          clearCountdown()
          countingDown.value = false
        }
        if (payload.type === 'countdownStart') {
          const secs = Math.max(0, Number(payload.durationSeconds) || 0)
          startLocalCountdown(secs)
        }
        if (payload.type === 'select' && payload.url) {
          const url = String(payload.url)
          const action = payload.action === 'ban' ? 'ban' : 'pick'
          const round = Number(payload.round || 1) === 2 ? 2 : 1
          // 更新对应轮的存储
          const targetEntries = round === 1 ? r1Entries : r2Entries
          const targetUsed = round === 1 ? r1Used : r2Used
          const targetSel = round === 1 ? r1Selected : r2Selected
          if (!targetUsed.value.includes(url)) targetUsed.value.push(url)
          if (action === 'pick' && !targetSel.value.includes(url)) targetSel.value.push(url)
          targetEntries.value.push({ url, action })
          // 若是当前轮次，同时应用到 UI
          if (round === currentRound.value) {
            if (action === 'ban') {
              applyBan(url)
            } else {
              applyPick(url)
            }
            barEntries.value.push({ url, action })
          }
        }
        if (payload.type === 'rollback') {
          const round = Number(payload.round || 1) === 2 ? 2 : 1
          const targetEntries = round === 1 ? r1Entries : r2Entries
          const be = targetEntries.value.pop()
          if (round === currentRound.value) applyRollback()
          else if (be) {
            const targetUsed = round === 1 ? r1Used : r2Used
            const targetSel = round === 1 ? r1Selected : r2Selected
            const iu = targetUsed.value.lastIndexOf(be.url)
            if (iu >= 0) targetUsed.value.splice(iu, 1)
            if (be.action === 'pick') {
              const is = targetSel.value.lastIndexOf(be.url)
              if (is >= 0) targetSel.value.splice(is, 1)
            }
          }
        }
    });

    // Inline Mappool: connect store websocket
    mappoolStore.connectWebSocket('ws://localhost:8080');
    if (mappoolStore.mappool.length === 0) {
        loadDefaultIndex()
    }
});

onBeforeUnmount(() => {
    socket?.disconnect();
    socket = null;
    clearCountdown()
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

.left-info {
    position: absolute;
    left: 24px;
    top: 0;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #2b2f3a;
    font-size: 14px;
}

.status-text {
    font-weight: 600;
}

.presence-group {
    display: inline-flex;
    align-items: center;
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

.title-btn.active {
    background: #2e6bff;
    color: #fff;
    border-color: #2e6bff;
}

.title-btn:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Mappool */
.mappool {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    margin-top: 12px;
}

.mappool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8px;
}

.team-name {
    font-size: 20px;
    font-weight: 600;
    color: #2b2f3a;
}

.team-name.left {
    color: #2e6bff; /* 蓝队 */
}

.team-name.right {
    color: #ff4d4f; /* 红队 */
}
.Mappool
{
    display: flex;
    flex-direction: row;
    align-items: center;
}
.team-track-container {
    width: 1800px;
    height: 400px;
    margin: 24px auto;
    display: block;
    overflow-y: auto;
    background: #d6dbd7f6;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    position: relative;
}

.pool-title {
    margin: 16px 24px 0 24px;
}

.team-track-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    padding: 16px 24px 24px 24px;
    width: 100%;
    align-content: start;
}

.team-track-item img {
    width: 200px;
    height: 150px;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    background: #fff;
    cursor: pointer;
}

.team-track-item img.disabled {
    filter: grayscale(100%);
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none; /* 禁止再次点击 */
}

.countdown-overlay {
    position: absolute;
    top: 8px;
    right: 16px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(0,0,0,0.6);
    color: #fff;
    font-weight: 700;
}

/* BanPickBar */
.banpickbar {
    padding: 12px 16px;
}

.boxes {
    display: grid;
    /* Responsive, centered grid using a configurable box size */
    --box-size: 80px;
    grid-template-columns: repeat(auto-fit, minmax(var(--box-size), var(--box-size)));
    justify-content: center;
    gap: 8px;
}

.boxes.wide {
    /* When boxCount > 9, make boxes slightly smaller and reduce gaps */
    --box-size: 70px;
    gap: 6px;
}

.box {
    width: var(--box-size);
    height: var(--box-size);
    background: #f0f0f0 center/cover no-repeat;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.box:not(.empty):hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0,0,0,0.12);
}

.box.ban {
    filter: grayscale(100%);
    opacity: 0.6;
}

.box.empty {
    background: repeating-linear-gradient(45deg, #fafafa, #fafafa 6px, #f1f1f1 6px, #f1f1f1 12px);
}

.box-label {
    position: absolute;
    left: 4px;
    top: 4px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 700;
    border-radius: 6px;
    color: #fff;
    background: rgba(0,0,0,0.55);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.box-label.teamA { border: 1px solid rgba(46,107,255,0.6); }
.box-label.teamB { border: 1px solid rgba(255,77,79,0.6); }
.box-label.ban { background: rgba(128,128,128,0.65); }
.box-label.empty { opacity: 0.6; }

.main {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: transparent;
}

:global(body) {
    background: url('@/assets/bg_1.jpg') center/cover no-repeat fixed;
}



.controls {
    padding: 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.controls .status {
    display: flex;
    gap: 24px;
}

/* Presence indicator */
.presence-pill {
    display: inline-block;
    margin-left: 6px;
    padding: 0 8px;
    height: 20px;
    line-height: 20px;
    border-radius: 10px;
    font-size: 12px;
    background: #f5f5f5;
    color: #666;
    border: 1px solid #e0e0e0;
}
.presence-pill.on {
    background: #e6ffed;
    color: #237804;
    border-color: #b7eb8f;
}

.controls .buttons {
    display: flex;
    gap: 12px;
}

/* Larger, more prominent action buttons */
.action-btn {
    padding: 10px 18px;
    font-size: 16px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #d0d0d0;
    cursor: pointer;
    transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.action-btn:hover:not(:disabled) {
    box-shadow: 0 3px 10px rgba(0,0,0,0.12);
    transform: translateY(-1px);
}
.action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
.action-btn.primary {
    background: #2e6bff;
    color: #fff;
    border-color: #2e6bff;
}
.action-btn.primary:disabled {
    background: #a7baf7;
    border-color: #a7baf7;
}
</style>