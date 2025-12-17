import { createRouter, createWebHistory } from "vue-router";

// Views will be lazy-loaded
const HomeView = () => import("../views/HomeView.vue");
const DashboardView = () => import("../views/DashboardView.vue");
const EditorView = () => import("../views/EditorView.vue");
const AdminView = () => import("../views/AdminView.vue");

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "home",
            component: HomeView,
        },
        {
            path: "/dashboard",
            name: "dashboard",
            component: DashboardView,
        },
        {
            path: "/editor/:id",
            name: "editor",
            component: EditorView,
        },
        {
            path: "/admin/templates",
            name: "admin",
            component: AdminView,
        },
    ],
});

export default router;
