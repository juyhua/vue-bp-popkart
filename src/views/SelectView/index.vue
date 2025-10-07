<template>
  <div class="select-view">
    <h2>第二届大马猴杯比赛BP信息设置</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-row">
        <label>A队队名：</label>
        <input v-model="teamA" required placeholder="请输入A队队名" />
      </div>
      <div class="form-row">
        <label>B队队名：</label>
        <input v-model="teamB" required placeholder="请输入B队队名" />
      </div>
      <div class="form-row">
        <label>选择时间：</label>
        <select v-model="matchTime">
          <option value="60">60秒</option>
          <option value="90">90秒</option>
          <option value="120">120秒</option>
          <option value="999">无限</option>
        </select>
      </div>
      <div class="form-row">
        <label>赛制：</label>
        <select v-model="boMode">
          <option value="BO5">BO5</option>
          <option value="BO9">BO9</option>
        </select>
      </div>
      <div class="form-row">
        <button type="submit">确定</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const teamA = ref('');
const teamB = ref('');
const matchTime = ref('60');
const boMode = ref('BO5');
const router = useRouter();

// function uuid() {
//   return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function () {
//     return ((Math.random() * 16) | 0).toString(16);
//   });
// }

function handleSubmit() {
  //onst simId = uuid();
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  router.push({
    name: 'link',
    query: {
      teamA: teamA.value,
      teamB: teamB.value,
      matchTime: matchTime.value,
      boMode: boMode.value,
      //simId,
      code
    }
  });
}
</script>

<style scoped>
.select-view:before {
  content: '';
  position: fixed;
  inset: 0;
  background: url('@/assets/bg_1.jpg') center/cover no-repeat fixed;
  z-index: -1;
}
.select-view {
  max-width: 600px;
  margin: 80px auto;
  padding: 32px;
  background: rgba(0,0,0,0.35);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  color: #fff;
}
.form-row {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}
label {
  width: 100px;
  font-weight: bold;
  color: #fff;
}
input, select {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.4);
  color: #fff;
}
input::placeholder {
  color: rgba(255,255,255,0.75);
}
select option {
  color: #000; /* dropdown list items stay readable in native menu */
}
button {
  width: 100%;
  padding: 10px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
}
button:hover {
  background: #3076c9;
}
</style>
