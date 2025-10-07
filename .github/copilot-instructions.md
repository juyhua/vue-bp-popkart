# Copilot Instructions for vue-bp-popkart

## 项目架构概览
- 本项目基于 **Vue 3** + **Vite**，采用 TypeScript。
- 主要目录结构：
  - `src/components/`：页面组件，分为 banpickbar、Mappool、title 等子目录。
  - `src/views/`：视图层，主视图为 `mainView`。
  - `src/assets/`：静态资源，包含 SoloTrack 和 TeamTrack 两类地图图片。
  - `src/stores/`：Pinia 状态管理（如 `counter.ts`）。
  - `public/`：公共资源（如 favicon）。

## 开发与构建流程
- 安装依赖：`npm install`
- 本地开发：`npm run dev`（热重载）
- 生产构建：`npm run build`
- 类型检查：推荐使用 `vue-tsc`，并在 VS Code 中安装 Volar 插件。

## 关键约定与模式
- 所有组件均为单文件组件（SFC），推荐使用 `<script setup lang="ts">`。
- 组件按功能分目录，命名采用英文+驼峰，地图图片命名为 `序号.主题_名称.扩展名`。
- 状态管理统一使用 Pinia，store 文件放在 `src/stores/`。
- 资源图片引用采用相对路径，示例：`@/assets/SoloTrack/01.ArthurLegend_PatrolRoad.jpg`
- 主入口为 `src/main.ts`，根组件为 `App.vue`。

## 调试与扩展
- 推荐使用 Vue.js Devtools 进行组件树和状态调试。
- 若需扩展地图池，直接在 `src/assets/SoloTrack/` 或 `TeamTrack/` 目录添加图片，命名遵循现有格式。
- 新增组件建议放在对应功能目录下，并在 `views` 或主组件中引用。

## 重要文件参考
- `vite.config.ts`：Vite 配置，支持别名 `@` 指向 `src/`。
- `tsconfig.json`/`tsconfig.app.json`：TypeScript 配置。
- `README.md`：开发环境与命令说明。

## 典型开发流程示例
1. 新建地图组件：在 `src/components/Mappool/` 下创建新 `.vue` 文件。
2. 引用地图图片：使用 `@/assets/SoloTrack/xx.xxx.jpg` 路径。
3. 状态管理：如需全局状态，使用 Pinia 并在 `stores/` 新建 store。
4. 运行 `npm run dev`，在浏览器调试。

---
如需补充项目约定、组件通信或特殊流程，请在此文件补充说明。
