import { createRouter, createWebHistory } from "vue-router";

// Views will be lazy-loaded
const HomeView = () => import("../views/HomeView.vue");
const DashboardView = () => import("../views/DashboardView.vue");
const EditorView = () => import("../views/EditorView.vue");
const AdminView = () => import("../views/AdminView.vue");
const PreviewView = () => import("../views/PreviewView.vue");

// Auth views
const LoginView = () => import("../views/auth/LoginView.vue");
const RegisterView = () => import("../views/auth/RegisterView.vue");

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        // Public routes
        {
            path: "/",
            name: "home",
            component: HomeView,
        },
        {
            path: "/login",
            name: "login",
            component: LoginView,
        },
        {
            path: "/register",
            name: "register",
            component: RegisterView,
        },
        // Legacy dashboard (admin/internal)
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
            path: "/preview/:id",
            name: "preview",
            component: PreviewView,
        },
        {
            path: "/admin/templates",
            name: "admin",
            component: AdminView,
        },
        // Customer routes (protected) - placeholder for now
        {
            path: "/my/dashboard",
            name: "customer-dashboard",
            component: DashboardView, // Will be replaced with CustomerDashboardView
            meta: { requiresAuth: true },
        },
    ],
});

export default router;
