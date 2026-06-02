import { Bell, CheckCheck, Heart, MessageCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import type { AppNotification } from "../data/database";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function NotificationBell({
  notifications,
  onOpenSession,
  onMarkAllRead,
}: {
  notifications: AppNotification[];
  onOpenSession?: (sessionId: string) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadNotifications = notifications.filter(
    (notification) => !notification.read,
  );
  const visibleNotifications = unreadNotifications.slice(0, 6);

  return (
    <div className="relative z-30 flex justify-end">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Notifications"
            className="relative h-11 w-11 border-line bg-card p-0 text-ink shadow-sm hover:bg-panel"
            type="button"
            variant="outline"
          >
            <Bell size={19} />
            {unreadNotifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.68rem] font-black leading-none text-white">
                {unreadNotifications.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <header className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[0.68rem] font-black uppercase text-soft-muted">
                Notifications
              </p>
              <h2 className="m-0 text-[1.15rem] leading-tight">
                Unread updates
              </h2>
            </div>
            <Button
              className="text-[0.78rem]"
              size="sm"
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadNotifications.length === 0}
            >
              <CheckCheck size={15} /> Read
            </Button>
          </header>

          {visibleNotifications.length === 0 ? (
            <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
              No unread notifications.
            </p>
          ) : (
            <div className="grid max-h-[420px] gap-2 overflow-auto pr-1">
              {visibleNotifications.map((notification) => (
                <article
                  className="flex items-start gap-2.5 rounded-lg border border-panel-border bg-panel p-2.5"
                  key={notification.id}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ink text-white">
                    {notificationIcon(notification.type)}
                  </span>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-teal text-[0.8rem] font-black text-white">
                    {notification.actorAvatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block leading-tight">
                      {notification.actorName}
                    </strong>
                    <p className="m-0 text-sm leading-snug text-[#34413d]">
                      {notification.message}
                    </p>
                    <small className="block text-soft-muted">
                      {notification.createdAt}
                    </small>
                  </div>
                  {notification.sessionId && onOpenSession && (
                    <Button
                      className="h-8 px-2 text-[0.75rem]"
                      size="sm"
                      type="button"
                      onClick={() => {
                        onOpenSession(notification.sessionId as string);
                        setOpen(false);
                      }}
                      variant="outline"
                    >
                      Open
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function notificationIcon(type: AppNotification["type"]) {
  if (type === "comment") return <MessageCircle size={16} />;
  if (type === "follow") return <UserPlus size={16} />;
  if (type === "kudos") return <Heart size={16} />;
  return <Bell size={16} />;
}
