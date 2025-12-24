import { createRouter, createWebHistory } from "vue-router";

// Views will be lazy-loaded
const HomeView = () => import("../views/HomeView.vue");
const DashboardView = () => import("../views/DashboardView.vue");
const CreateView = () => import("../views/CreateView.vue");
const EditorView = () => import("../views/EditorView.vue");
const AdminView = () => import("../views/AdminView.vue");
const PreviewView = () => import("../views/PreviewView.vue");
const TemplateStoreView = () => import("../views/TemplateStoreView.vue");
const OnboardingView = () => import("../views/OnboardingView.vue");
const GuestManagementView = () => import("../views/auth/GuestManagementView.vue");

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
            path: "/templates",
            name: "template-store",
            component: TemplateStoreView,
        },

        // Authentication group
        {
            path: "/auth",
            children: [
                {
                    path: "login",
                    name: "login",
                    component: LoginView,
                },
                {
                    path: "register",
                    name: "register",
                    component: RegisterView,
                },
            ]
        },

        // Application group (Protected)
        {
            path: "/app",
            meta: { requiresAuth: true },
            children: [
                {
                    path: "dashboard",
                    name: "customer-dashboard",
                    component: DashboardView,
                    meta: { roles: ['user', 'admin'] },
                },
                {
                    path: "onboarding",
                    name: "onboarding",
                    component: OnboardingView,
                    meta: { roles: ['user', 'admin'] },
                },
                {
                    path: "editor/:slug",
                    name: "create",
                    component: CreateView,
                    meta: { roles: ['user', 'admin'] },
                },
                {
                    path: "profile",
                    name: "profile",
                    component: ProfileView,
                },
                {
                    path: "guests/:invitationId",
                    name: "guest-management",
                    component: GuestManagementView,
                    meta: { roles: ['user', 'admin'] },
                },
            ]
        },

        // Admin group
        {
            path: "/admin",
            meta: { requiresAuth: true, roles: ['admin'] },
            children: [
                {
                    path: "templates",
                    name: "admin",
                    component: AdminView,
                },
                {
                    path: "editor/:id",
                    name: "editor",
                    component: EditorView,
                },
                {
                    path: "preview/:id",
                    name: "admin-preview",
                    component: PreviewView,
                },
            ]
        },

        // Legacy Redirects
        { path: "/login", redirect: "/auth/login" },
        { path: "/register", redirect: "/auth/register" },
        { path: "/dashboard", redirect: "/app/dashboard" },
        { path: "/my/dashboard", redirect: "/app/dashboard" },
        { path: "/onboarding", redirect: "/app/onboarding" },
        { path: "/profile", redirect: "/app/profile" },
        { path: "/create/:slug", redirect: "/app/editor/:slug" },

        // Root slug route (Catch-all for invitations)
        // MUST BE LAST
        {
            path: "/:slug",
            name: "public-invitation",
            component: PreviewView,
        }
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
        const isAuthRoute = to.name === 'login' || to.name === 'register';
        if (isAuthenticated && isAuthRoute) {
            return next({ name: 'customer-dashboard' });
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
        // Users can access dashboard regardless of invitation status
        // Creating invitations is now optional/manual
    }

    // 5. Users can access onboarding to create additional invitations
    // Previously: redirected to dashboard if hasInvitationCache === true
    // Now: Allow users to create multiple invitations

    next();
});

export default router;

