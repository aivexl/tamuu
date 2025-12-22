import { createRouter, createWebHistory } from "vue-router";

// Views will be lazy-loaded
const HomeView = () => import("../views/HomeView.vue");
const DashboardView = () => import("../views/DashboardView.vue");
const EditorView = () => import("../views/EditorView.vue");
const AdminView = () => import("../views/AdminView.vue");
const PreviewView = () => import("../views/PreviewView.vue");
const TemplateStoreView = () => import("../views/TemplateStoreView.vue");

// Auth views
const LoginView = () => import("../views/auth/LoginView.vue");
const RegisterView = () => import("../views/auth/RegisterView.vue");
const ProfileView = () => import("../views/auth/ProfileView.vue");

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
            meta: { requiresAuth: true, roles: ['admin'] },
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
            meta: { requiresAuth: true, roles: ['admin'] },
        },
        {
            path: "/templates",
            name: "template-store",
            component: TemplateStoreView,
        },
        {
            path: "/profile",
            name: "profile",
            component: ProfileView,
            meta: { requiresAuth: true },
        },
        // Customer routes (protected)
        {
            path: "/my/dashboard",
            name: "customer-dashboard",
            component: DashboardView,
            meta: { requiresAuth: true, roles: ['user', 'admin'] },
        },
    ],
});

// ============================================
// NAVIGATION GUARDS (RBAC)
// ============================================

import { useAuthStore } from "@/stores/auth";

router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore();

    // Initialize auth if needed
    if (!authStore.isInitialized) {
        await authStore.init();
    }

    const { isAuthenticated, user } = authStore;
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const requiredRoles = to.meta.roles as string[] | undefined;

    // 1. Check if route is public
    if (!requiresAuth && !requiredRoles) {
        if (isAuthenticated && (to.name === 'login' || to.name === 'register')) {
            return next({ name: 'dashboard' });
        }
        return next();
    }

    // 2. Not authenticated? Redirect to login
    if (!isAuthenticated) {
        return next({
            name: 'login',
            query: { redirect: to.fullPath }
        });
    }

    // 3. User Role Check (RBAC)
    if (requiredRoles && user) {
        const hasAccess = requiredRoles.includes(user.role);

        if (!hasAccess) {
            console.warn(`[RBAC] Access denied to ${to.path}. Required: ${requiredRoles}, Actual: ${user.role}`);

            // Redirect based on role
            if (user.role === 'admin') {
                return next({ name: 'admin' });
            } else {
                return next({ name: 'template-store' });
            }
        }
    }

    next();
});

export default router;
