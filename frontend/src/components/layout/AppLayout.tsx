import { Outlet } from "react-router-dom";
import { NotificationsListener } from "../../features/notifications/NotificationsListener";
import { BottomTabBar } from "./BottomTabBar";
import { NotificationBell } from "./NotificationBell";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="relative min-h-screen">
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
      <NotificationBell />
      <NotificationsListener />

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5 lg:pb-12 lg:pt-8">
          <Outlet />
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
