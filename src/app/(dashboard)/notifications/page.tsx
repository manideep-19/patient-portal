"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Calendar,
  Pill,
  FileText,
  HeartPulse,
  Sparkles,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationType } from "@/data/mock-notifications";

export default function NotificationsPage() {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = usePatient();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const displayedNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "appointment":
        return <Calendar className="w-4 h-4 text-brand" />;
      case "medication":
        return <Pill className="w-4 h-4 text-brand" />;
      case "lab":
        return <FileText className="w-4 h-4 text-brand" />;
      case "care_loop":
        return <HeartPulse className="w-4 h-4 text-brand" />;
      default:
        return <Bell className="w-4 h-4 text-brand" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Real-time reminders for appointments, medication doses, and lab reports.
          </p>
        </div>

        {unreadNotificationsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllNotificationsRead}
            className="shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filter === "all"
              ? "bg-brand text-white shadow-xs"
              : "bg-card border border-border text-ink-soft hover:text-ink"
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setFilter("unread")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            filter === "unread"
              ? "bg-brand text-white shadow-xs"
              : "bg-card border border-border text-ink-soft hover:text-ink"
          }`}
        >
          Unread ({unreadNotificationsCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {displayedNotifications.length > 0 ? (
          displayedNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={`transition-all ${
                !notif.read
                  ? "bg-gradient-to-r from-card via-card to-brand-soft/30 border-brand/40 shadow-xs"
                  : "bg-card/70 border-border/70"
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    !notif.read ? "bg-brand-soft text-brand-dark" : "bg-lavender text-ink-soft"
                  }`}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-xs sm:text-sm leading-tight truncate ${
                        !notif.read ? "font-bold text-ink" : "font-medium text-ink/80"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-ink-soft shrink-0">{notif.timeAgo}</span>
                  </div>

                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">{notif.message}</p>

                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40 text-xs">
                    {notif.actionUrl && (
                      <Link
                        href={notif.actionUrl}
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-brand font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {!notif.read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-ink-soft hover:text-ink text-[11px] ml-auto cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<Bell className="w-8 h-8 text-brand" />}
            title="All Caught Up!"
            description={
              filter === "unread"
                ? "You have no unread notifications right now."
                : "No notifications found."
            }
          />
        )}
      </div>
    </div>
  );
}
