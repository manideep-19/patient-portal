"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  ShieldCheck,
  Globe,
  Bell,
  Sparkles,
  LogOut,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const {
    patient,
    switchPatient,
    isEmptyState,
    toggleEmptyState,
    resetAllDemoData,
    logout,
  } = usePatient();

  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [channels, setChannels] = useState({
    whatsapp: true,
    sms: true,
    push: true,
    email: false,
  });

  const handleToggleChannel = (key: keyof typeof channels) => {
    setChannels((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast.success("Notification Preference Updated", {
        description: `${key.toUpperCase()} alerts ${next[key] ? "enabled" : "disabled"}.`,
      });
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Patient Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
          Manage your personal medical information, emergency contacts, and notifications.
        </p>
      </div>

      {/* Main Profile Card */}
      <Card className="border-brand/20 shadow-soft overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar
              name={patient.name}
              src={patient.avatarUrl}
              size="xl"
              className="ring-4 ring-brand/20 shadow-md shrink-0"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-ink">{patient.name}</h2>
                <Badge variant="primary" size="sm">
                  Active Patient
                </Badge>
              </div>

              <p className="text-xs text-ink-soft mt-1">
                UHID: <strong className="font-mono text-ink">{patient.uhid}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/50 text-xs">
                <span className="p-1.5 px-2.5 rounded-lg bg-lavender-soft font-semibold text-ink">
                  {patient.age} Years • {patient.gender}
                </span>
                <span className="p-1.5 px-2.5 rounded-lg bg-lavender-soft font-semibold text-brand-dark">
                  Blood Group: {patient.bloodGroup}
                </span>
                <span className="p-1.5 px-2.5 rounded-lg bg-lavender-soft font-semibold text-ink-soft">
                  {patient.city}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Emergency Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact Info */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Contact Details
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-lavender-soft/40">
                <Phone className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <span className="text-[10px] text-ink-soft">Mobile</span>
                  <p className="font-semibold text-ink">{patient.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-lavender-soft/40">
                <Mail className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <span className="text-[10px] text-ink-soft">Email</span>
                  <p className="font-semibold text-ink">{patient.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-lavender-soft/40">
                <MapPin className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <span className="text-[10px] text-ink-soft">Residential Address</span>
                  <p className="font-semibold text-ink leading-tight">{patient.address}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Emergency Contact
              </h3>
              <Badge variant="secondary" size="sm">
                Spouse
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-lavender-soft/40 border border-border/60 space-y-1">
                <span className="text-[10px] text-ink-soft">Name & Relationship</span>
                <p className="font-bold text-ink">
                  {patient.emergencyContact.name} ({patient.emergencyContact.relationship})
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-brand font-semibold">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{patient.emergencyContact.phone}</span>
                </div>
              </div>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Clinic staff will contact this number in case of acute medical changes during treatment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ABHA / Ayushman Bharat Digital Mission (Demo Display) */}
      <Card className="border-border/80">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" />
              <h3 className="text-sm font-bold text-ink">
                Ayushman Bharat Digital Health Account (ABHA)
              </h3>
            </div>
            <Badge variant="success" size="sm">
              Linked (Demo Preview)
            </Badge>
          </div>

          <div className="p-3.5 rounded-2xl bg-success/10 border border-success/20 text-xs text-ink space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-success">ABHA Address:</span>
              <span className="font-mono font-semibold">ananya.sharma@abdm</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-success">ABHA Number:</span>
              <span className="font-mono font-semibold">{patient.abhaId}</span>
            </div>
          </div>
          <p className="text-[11px] text-ink-soft">
            Demo Display: Diagnostic reports and doctor prescriptions can be shared across participating ABDM facilities.
          </p>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">Notification Channels</h3>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
              <div>
                <span className="font-semibold text-ink">WhatsApp Reminders (Care Loop)</span>
                <p className="text-[11px] text-ink-soft">Injection timings and doctor updates</p>
              </div>
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={() => handleToggleChannel("whatsapp")}
                className="w-4 h-4 accent-brand cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
              <div>
                <span className="font-semibold text-ink">SMS Text Alerts</span>
                <p className="text-[11px] text-ink-soft">Booking confirmations and OTPs</p>
              </div>
              <input
                type="checkbox"
                checked={channels.sms}
                onChange={() => handleToggleChannel("sms")}
                className="w-4 h-4 accent-brand cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer">
              <div>
                <span className="font-semibold text-ink">App Push Notifications</span>
                <p className="text-[11px] text-ink-soft">Real-time teleconsultation alerts</p>
              </div>
              <input
                type="checkbox"
                checked={channels.push}
                onChange={() => handleToggleChannel("push")}
                className="w-4 h-4 accent-brand cursor-pointer"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Language Selector */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">Preferred Communication Language</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {["English", "हिन्दी (Hindi)", "ಕನ್ನಡ (Kannada)", "தமிழ் (Tamil)"].map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLanguage(lang);
                  toast.success(`Language updated to ${lang}`);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedLanguage === lang
                    ? "border-brand bg-brand-soft/50 font-bold text-brand-dark"
                    : "border-border bg-card text-ink-soft hover:text-ink"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Switch Demo Patient Profile Section */}
      <Card className="border-brand/30 bg-gradient-to-r from-card to-brand-soft/20">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-ink">Demo Persona Switcher</h3>
          </div>
          <p className="text-xs text-ink-soft">
            Quickly test the patient portal from different clinical viewpoints:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <button
              onClick={() => switchPatient("pat-101")}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                patient.id === "pat-101" && !isEmptyState
                  ? "border-brand bg-brand text-white font-bold"
                  : "border-border bg-card text-ink hover:bg-lavender-soft"
              }`}
            >
              <div className="font-semibold">Ananya Sharma</div>
              <div className="text-[10px] opacity-80 mt-0.5">Active IVF Stimulation</div>
            </button>

            <button
              onClick={() => switchPatient("pat-102")}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                patient.id === "pat-102"
                  ? "border-brand bg-brand text-white font-bold"
                  : "border-border bg-card text-ink hover:bg-lavender-soft"
              }`}
            >
              <div className="font-semibold">Rahul Mehta</div>
              <div className="text-[10px] opacity-80 mt-0.5">Andrology Consultation</div>
            </button>

            <button
              onClick={toggleEmptyState}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                isEmptyState
                  ? "border-amber-500 bg-amber-500 text-ink font-bold"
                  : "border-border bg-card text-ink hover:bg-lavender-soft"
              }`}
            >
              <div className="font-semibold">Toggle Empty State</div>
              <div className="text-[10px] opacity-80 mt-0.5">New Patient Zero Records</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Reset & Sign Out Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          size="lg"
          onClick={resetAllDemoData}
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset Demo Data to Default</span>
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="flex-1"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
