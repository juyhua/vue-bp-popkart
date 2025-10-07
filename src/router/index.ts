import { createRouter, createWebHashHistory } from 'vue-router';
import SelectView from '../views/SelectView/index.vue';
import LinkView from '../views/LinkView/index.vue';
import MainView from '../views/mainView/index.vue';

const routes = [
  { path: '/', name: 'select', component: SelectView },
  { path: '/link', name: 'link', component: LinkView },
  { path: '/main', name: 'main', component: MainView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
