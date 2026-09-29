import { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DailyMemory } from "../../features/couple/DailyMemory";
import { NotificationsListener } from "../../features/notifications/NotificationsListener";
import { AppFonts } from "../../features/profile/AppFonts";
import { BottomTabBar } from "./BottomTabBar";
import { GlassSync } from "./GlassSync";
import { LoveBurst } from "./LoveBurst";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";
import { ColorModeSync } from "./ColorModeSync";
import { DesktopTopBar } from "./DesktopTopBar";
import { RightRail } from "./RightRail";
import { SharedLook } from "./SharedLook";
import { Sidebar } from "./Sidebar";
import { Loader } from "../ui/states";
import { primeSound } from "../../lib/feel";

export function AppLayout() {
  // Between lg and xl the right rail is a drawer; a new page closes it.
  const [railOpen, setRailOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setRailOpen(false), [pathname]);
  const closeRail = useCallback(() => setRailOpen(false), []);
  useEffect(() => primeSound(), []); // sounds can play once the page was touched

  return (
    <div className="relative min-h-dvh">
      <SharedLook />
      <ColorModeSync />

      <DesktopTopBar railOpen={railOpen} onRail={() => setRailOpen((o) => !o)} />
      <Sidebar />
      <RightRail open={railOpen} onClose={closeRail} />
      {/* Mobile top bar backdrop: content scrolls under it, never under bare buttons. */}
      <div className="fixed inset-x-0 top-0 z-30 h-[var(--topbar-h)] glass border-b border-border lg:hidden" aria-hidden="true" />
      <MobileMenu />
      <NotificationBell />
      <NotificationsListener />
      <LoveBurst />
      <AppFonts />
      <GlassSync />
      <DailyMemory />

      <main className="lg:pl-shell lg:pt-desk-bar xl:pr-shell-right">
        {/* Clears the top bar (burger + bell, below the status bar) and whatever covers the
            bottom: the tab bar, or the emoji sheet while it is open (--picker-h). */}
        <div className="mx-auto w-full max-w-content px-4 lg:px-6 pb-[calc(max(var(--tabbar-h),var(--picker-h,0px))+1rem)] pt-[calc(var(--topbar-h)+1rem)] lg:pb-[calc(max(2rem,var(--picker-h,0px))+1rem)] lg:pt-8">
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
