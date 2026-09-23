import { Outlet } from "react-router-dom";
import { NotificationsListener } from "../../features/notifications/NotificationsListener";
import { BottomTabBar } from "./BottomTabBar";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="relative min-h-dvh">
      {/* Decorative aurora (à fond) — purely visual, behind everything. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--grad)", animation: "float-slow 12s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-20 top-1/3 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--grad)", animation: "float-slow 16s ease-in-out infinite reverse" }}
        />
      </div>

      <Sidebar />
      {/* Mobile top bar backdrop: content scrolls under it, never under bare buttons. */}
      <div className="fixed inset-x-0 top-0 z-30 h-[var(--topbar-h)] glass border-b border-border lg:hidden" aria-hidden="true" />
      <MobileMenu />
      <NotificationBell />
      <NotificationsListener />

      <main className="lg:pl-64">
        {/* Clears the top bar (burger + bell, below the status bar) and whatever covers the
            bottom: the tab bar, or the emoji sheet while it is open (--picker-h). */}
        <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(max(var(--tabbar-h),var(--picker-h,0px))+1rem)] pt-[calc(var(--topbar-h)+1rem)] lg:pb-[calc(max(2rem,var(--picker-h,0px))+1rem)] lg:pt-8">
          <Outlet />
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
