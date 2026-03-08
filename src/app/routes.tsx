import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { AdminLayout } from "./components/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { InviteAcceptPage } from "./pages/InviteAcceptPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TeamChannelsPage } from "./pages/TeamChannelsPage";
import { ChannelDetailPage } from "./pages/ChannelDetailPage";
import { TeamSourcesPage } from "./pages/TeamSourcesPage";
import { SourceDetailPage } from "./pages/SourceDetailPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { TeamJobsPage } from "./pages/TeamJobsPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { TeamMembersPage } from "./pages/TeamMembersPage";
import { TeamSettingsPage } from "./pages/TeamSettingsPage";
import { LLMTracePage } from "./pages/LLMTracePage";
import { TeamLLMTracesPage } from "./pages/TeamLLMTracesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { AdminTeamsPage } from "./pages/AdminTeamsPage";
import { AdminLLMAnalyticsPage } from "./pages/AdminLLMAnalyticsPage";
import { AdminAdminsPage } from "./pages/AdminAdminsPage";
import { AdminInvitesPage } from "./pages/AdminInvitesPage";
import { AdsCampaignsPage } from "./pages/AdsCampaignsPage";
import { AdsCampaignDetailPage } from "./pages/AdsCampaignDetailPage";
import { AdsPostsPage } from "./pages/AdsPostsPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { PostsPage } from "./pages/PostsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  // ── Public routes ──
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage,
  },
  {
    path: "/invite/:token",
    Component: InviteAcceptPage,
  },
  {
    path: "/onboarding",
    Component: OnboardingPage,
  },

  // ── Admin routes (separate layout) ──
  {
    path: "/admin/login",
    Component: AdminLoginPage,
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      {
        path: "dashboard",
        Component: AdminDashboardPage,
      },
      {
        path: "users",
        Component: AdminUsersPage,
      },
      {
        path: "users/:userId",
        Component: UserDetailPage,
      },
      {
        path: "invites",
        Component: AdminInvitesPage,
      },
      {
        path: "teams",
        Component: AdminTeamsPage,
      },
      {
        path: "admins",
        Component: AdminAdminsPage,
      },
      {
        path: "llm-analytics",
        Component: AdminLLMAnalyticsPage,
      },
      {
        path: "llm-traces/:traceId",
        Component: LLMTracePage,
      },
    ],
  },

  // ── User routes (team context) ──
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: "channels",
        Component: TeamChannelsPage,
      },
      {
        path: "channels/:channelId",
        Component: ChannelDetailPage,
      },
      {
        path: "sources",
        Component: TeamSourcesPage,
      },
      {
        path: "sources/:sourceId",
        Component: SourceDetailPage,
      },
      {
        path: "items",
        Component: ItemsPage,
      },
      {
        path: "items/:itemId",
        Component: ItemDetailPage,
      },
      {
        path: "posts",
        Component: PostsPage,
      },
      {
        path: "posts/:postId",
        Component: PostDetailPage,
      },
      {
        path: "jobs",
        Component: TeamJobsPage,
      },
      {
        path: "jobs/:jobId",
        Component: JobDetailPage,
      },
      {
        path: "llm-traces",
        Component: TeamLLMTracesPage,
      },
      {
        path: "llm-traces/:traceId",
        Component: LLMTracePage,
      },
      {
        path: "members",
        Component: TeamMembersPage,
      },
      {
        path: "settings",
        Component: TeamSettingsPage,
      },
      {
        path: "ads",
        Component: AdsCampaignsPage,
      },
      {
        path: "ads/posts",
        Component: AdsPostsPage,
      },
      {
        path: "ads/:campaignId",
        Component: AdsCampaignDetailPage,
      },
      {
        path: "profile",
        Component: ProfilePage,
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);