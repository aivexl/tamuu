import { createRouter, createWebHistory } from "vue-router";

// Views will be lazy-loaded
const HomeView = () => import("../views/HomeView.vue");
const DashboardView = () => import("../views/DashboardView.vue");
const EditorView = () => import("../views/EditorView.vue");
const AdminView = () => import("../views/AdminView.vue");
const PreviewView = () => import("../views/PreviewView.vue");
const TemplateStoreView = () => import("../views/TemplateStoreView.vue");
const OnboardingView = () => import("../views/OnboardingView.vue");

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
            meta: { requiresAuth: true },
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
        // User Onboarding (create slug + select template)
        {
            path: "/create",
            name: "onboarding",
            component: OnboardingView,
            meta: { requiresAuth: true, roles: ['user', 'admin'] },
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
import { invitationsApi } from "@/lib/api/invitations";

// Cache for user invitations check (avoid repeated API calls)
let hasInvitationCache: boolean | null = null;
let lastCheckedUserId: string | null = null;

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

    // 4. Onboarding Check for regular users accessing customer-dashboard
    if (user && user.role === 'user' && to.name === 'customer-dashboard') {
        // Check if cache needs refresh (different user or no cache)
        if (lastCheckedUserId !== user.id || hasInvitationCache === null) {
            try {
                const invitations = await invitationsApi.getMyInvitations();
                hasInvitationCache = invitations.length > 0;
                lastCheckedUserId = user.id;
            } catch (error) {
                console.error('[Router] Failed to check invitations:', error);
                // On error, allow access (fail open) - user can retry
                hasInvitationCache = true;
            }
        }

        // If no invitation, redirect to onboarding
        if (!hasInvitationCache) {
            console.log('[Router] User has no invitation, redirecting to onboarding');
            return next({ name: 'onboarding' });
        }
    }

    // 5. Already has invitation trying to access onboarding? Redirect to dashboard
    if (user && user.role === 'user' && to.name === 'onboarding' && hasInvitationCache === true) {
        return next({ name: 'customer-dashboard' });
    }

    next();
});

export default router;

