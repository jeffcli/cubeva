import { Activity, LogOut, Timer, Trophy, Users } from "lucide-react";
import type { AppView } from "../types/app";

export function AppSidebar({
  activeView,
  demoMode,
  onNavigate,
  onShowProfile,
  onSignOut,
}: {
  activeView: AppView;
  demoMode: boolean;
  onNavigate: (view: AppView) => void;
  onShowProfile: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-accent font-black text-[#101615] shadow-[inset_-10px_-10px_0_#f5a623,inset_10px_10px_0_#2f81ed]">
          CV
        </div>
        <div>
          <h1 className="m-0 text-[1.35rem]">CubeVa</h1>
          <p className="m-0 text-soft-muted">Training feed for speedcubers</p>
        </div>
      </div>
      <button
        className="min-h-[42px] bg-ink px-3 text-white"
        type="button"
        onClick={onSignOut}
      >
        <LogOut size={17} /> {demoMode ? "Exit demo" : "Sign out"}
      </button>

      <nav className="grid gap-2" aria-label="Primary">
        <SidebarButton
          active={activeView === "feed"}
          icon={<Activity size={18} />}
          label="Feed"
          onClick={() => onNavigate("feed")}
        />
        <SidebarButton
          active={activeView === "timer"}
          icon={<Timer size={18} />}
          label="Timer"
          onClick={() => onNavigate("timer")}
        />
        <SidebarButton
          active={activeView === "people"}
          icon={<Users size={18} />}
          label="People"
          onClick={() => onNavigate("people")}
        />
        <SidebarButton
          active={activeView === "profile"}
          icon={<Trophy size={18} />}
          label="Profile"
          onClick={onShowProfile}
        />
      </nav>
    </aside>
  );
}

function SidebarButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full justify-start gap-2.5 p-3 ${
        active
          ? "bg-ink text-white"
          : "bg-transparent text-[#34413d] hover:bg-ink hover:text-white"
      }`}
      type="button"
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}
