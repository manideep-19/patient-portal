"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UserCheck,
  Calendar,
  FileText,
  HeartPulse,
  Bell,
  Sparkles,
  RefreshCw,
  LogOut,
  ChevronDown,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatient } from "@/context/patient-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "sonner";
import { StartCallModal } from "@/components/telehealth/start-call-modal";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const {
    patient,
    switchPatient,
    isEmptyState,
    toggleEmptyState,
    unreadNotificationsCount,
    pendingCareTasks,
    upcomingAppointments,
    logout,
  } = usePatient();

  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isStartCallModalOpen, setIsStartCallModalOpen] = React.useState(false);

  // If on login or telehealth video call full-screen, render minimal shell
  const isAuthPage = pathname?.includes("/login") || pathname === "/";
  const isTelehealthRoom = pathname?.includes("/telehealth/") && !pathname?.endsWith("/telehealth");

  if (isAuthPage) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
        <Toaster position="top-center" richColors closeButton />
        {children}
      </div>
    );
  }

  if (isTelehealthRoom) {
    return (
      <div className="h-[100dvh] w-full bg-ink text-white overflow-hidden font-sans">
        <Toaster position="top-center" richColors closeButton />
        {children}
      </div>
    );
  }

  const navItems = [
    {
      label: "Home",
      href: "/home",
      icon: Home,
      badgeCount: 0,
    },
    {
      label: "Doctors",
      href: "/doctors",
      icon: UserCheck,
      badgeCount: 0,
    },
    {
      label: "Appointments",
      href: "/appointments",
      icon: Calendar,
      badgeCount: upcomingAppointments.length > 0 ? upcomingAppointments.length : 0,
    },
    {
      label: "AI Consult",
      href: "/ai-consultation",
      icon: Sparkles,
      badgeCount: 0,
      highlight: true,
    },
    {
      label: "Online Call",
      href: "/telehealth",
      icon: Video,
      badgeCount: 0,
    },
    {
      label: "Records",
      href: "/records",
      icon: FileText,
      badgeCount: 0,
      desktopOnly: true,
    },
    {
      label: "Care",
      href: "/care",
      icon: HeartPulse,
      badgeCount: pendingCareTasks.length > 0 ? pendingCareTasks.length : 0,
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans antialiased pb-20 md:pb-6">
      <Toaster position="top-center" richColors closeButton />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 shadow-xs safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Clinic Info */}
          <Link href="/home" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-lg shadow-soft group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/branding/smrkomed-mark.png"
                alt="SmrkoMed Mark"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
              <span className="hidden">SM</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-ink group-hover:text-brand transition-colors">
                  SmrkoMed
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-brand-soft text-brand-dark">
                  Patient
                </span>
              </div>
              <p className="text-[11px] text-ink-soft hidden sm:block truncate max-w-[200px]">
                Indiranagar Clinic & Hospital
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-lavender/60 p-1 rounded-2xl border border-border/50">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 select-none",
                    isActive
                      ? "bg-card text-brand font-semibold shadow-xs"
                      : "text-ink-soft hover:text-ink hover:bg-card/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-brand" : "text-ink-soft")} />
                  <span>{item.label}</span>
                  {item.badgeCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Start Live Call Header Button */}
            <button
              onClick={() => setIsStartCallModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark active:scale-95 transition-all cursor-pointer"
              title="Start Live Video Call"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start Call</span>
            </button>

            {/* Notifications Bell */}
            <Link
              href="/notifications"
              className="relative p-2.5 rounded-xl text-ink-soft hover:text-ink hover:bg-lavender transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
              )}
            </Link>

            {/* User Profile Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-lavender/80 transition-colors cursor-pointer border border-transparent hover:border-border/60"
                aria-label="User profile menu"
              >
                <Avatar
                  name={patient.name}
                  src={patient.avatarUrl}
                  size="sm"
                  className="ring-2 ring-brand/20"
                />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-ink leading-tight">
                    {patient.firstName}
                  </span>
                  <span className="text-[10px] text-ink-soft">{patient.uhid}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-ink-soft hidden lg:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-card rounded-2xl border border-border shadow-xl p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="p-2 border-b border-border/50 pb-3 mb-2">
                      <p className="text-sm font-semibold text-ink">{patient.name}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{patient.phone}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" size="sm">
                          UHID: {patient.uhid}
                        </Badge>
                        {patient.abhaLinked && (
                          <Badge variant="success" size="sm">
                            ABHA Linked
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quick Demo Switches */}
                    <div className="space-y-1 mb-2">
                      <p className="text-[10px] uppercase font-bold text-ink-soft tracking-wider px-2 py-1">
                        Demo Controls
                      </p>
                      <button
                        onClick={() => {
                          switchPatient("pat-101");
                          setShowProfileMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-lavender transition-colors",
                          patient.id === "pat-101" && !isEmptyState ? "font-semibold text-brand bg-brand-soft/50" : "text-ink-soft"
                        )}
                      >
                        <span>Ananya Sharma (IVF Active)</span>
                        {patient.id === "pat-101" && !isEmptyState && <Sparkles className="w-3 h-3 text-brand" />}
                      </button>

                      <button
                        onClick={() => {
                          switchPatient("pat-102");
                          setShowProfileMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-lavender transition-colors",
                          patient.id === "pat-102" ? "font-semibold text-brand bg-brand-soft/50" : "text-ink-soft"
                        )}
                      >
                        <span>Rahul Mehta (Andrology)</span>
                        {patient.id === "pat-102" && <Sparkles className="w-3 h-3 text-brand" />}
                      </button>

                      <button
                        onClick={() => {
                          toggleEmptyState();
                          setShowProfileMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between hover:bg-lavender transition-colors",
                          isEmptyState ? "font-semibold text-amber-700 bg-amber-50" : "text-ink-soft"
                        )}
                      >
                        <span>Toggle New Patient (Empty State)</span>
                        <RefreshCw className="w-3 h-3 text-ink-soft" />
                      </button>
                    </div>

                    <div className="border-t border-border/50 pt-2 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-ink hover:bg-lavender flex items-center gap-2"
                      >
                        <span>View Profile & Settings</span>
                      </Link>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out (Demo)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 shadow-dock safe-bottom">
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1 items-center">
          {navItems.filter((i) => !i.desktopOnly).map((item) => {
            const isActive = pathname === item.href || (item.href !== "/home" && pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center h-full py-1 transition-all select-none relative group",
                  isActive ? "text-brand" : "text-ink-soft hover:text-ink"
                )}
              >
                {/* Active top pill */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 rounded-full bg-brand" />
                )}

                <div className="relative">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform group-active:scale-90",
                      isActive ? "text-brand stroke-[2.4]" : "text-ink-soft"
                    )}
                  />
                  {item.badgeCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badgeCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 tracking-tight leading-tight transition-colors",
                    isActive ? "font-bold text-brand" : "font-medium text-ink-soft"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Global Start Call Modal */}
      <StartCallModal
        isOpen={isStartCallModalOpen}
        onClose={() => setIsStartCallModalOpen(false)}
        patientName={patient.name}
      />
    </div>
  );
}
