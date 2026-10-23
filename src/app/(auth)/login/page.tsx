"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Phone,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const { login, switchPatient } = usePatient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("9845012345");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep("otp");
      setOtp("1234"); // Auto-fill demo OTP
      setCountdown(30);
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (otp.length < 4) {
      setErrorMessage("Please enter the 4-digit verification code.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const success = login(phoneNumber, otp);
      if (success) {
        router.push("/home");
      }
    }, 400);
  };

  const handleQuickDemoLogin = (profileId: string, phone: string) => {
    switchPatient(profileId);
    login(phone, "1234");
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-md mx-auto px-4 py-8 sm:py-12">
      {/* Top Branding */}
      <div className="flex flex-col items-center text-center mt-2 sm:mt-6">
        <div className="w-16 h-16 rounded-3xl bg-brand text-white flex items-center justify-center shadow-lift p-2 mb-4 overflow-hidden">
          <img
            src="/branding/smrkomed-mark.png"
            alt="SmrkoMed Mark"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          SmrkoMed
        </h1>
        <p className="text-sm font-medium text-brand-dark mt-1">
          Patient Portal & Care Loop
        </p>
        <p className="text-xs text-ink-soft max-w-xs mt-2 leading-relaxed">
          Access your consultations, treatment plans, prescriptions, and health records securely.
        </p>
      </div>

      {/* Main Auth Card */}
      <Card className="my-6 border-border shadow-soft bg-card/90 backdrop-blur-sm">
        <CardContent className="p-6">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-2xl border border-border bg-lavender-soft/40 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand transition-all">
                  <div className="flex items-center gap-1.5 pr-2.5 border-r border-border/80 text-xs font-semibold text-ink">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, ""));
                      setErrorMessage("");
                    }}
                    placeholder="Enter 10-digit number"
                    className="flex-1 bg-transparent border-none outline-none px-3 text-sm font-semibold text-ink placeholder:text-ink-soft/60"
                    autoFocus
                  />
                  <Phone className="w-4 h-4 text-ink-soft" />
                </div>
                {errorMessage && (
                  <p className="text-xs text-destructive mt-1.5 font-medium">{errorMessage}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting}
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-soft text-center pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>Simulated Secure OTP • 256-bit Healthcare Encryption</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-1 text-xs text-brand font-medium hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change number</span>
                </button>
                <Badge variant="secondary" size="sm">
                  +91 {phoneNumber}
                </Badge>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                  Enter 4-Digit OTP
                </label>
                <div className="flex items-center rounded-2xl border border-border bg-lavender-soft/40 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand transition-all">
                  <KeyRound className="w-4 h-4 text-brand mr-2" />
                  <input
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ""));
                      setErrorMessage("");
                    }}
                    placeholder="1234"
                    className="flex-1 bg-transparent border-none outline-none text-base font-bold tracking-widest text-ink text-center placeholder:text-ink-soft/40"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-ink-soft">
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code?"}
                  </span>
                  {countdown === 0 && (
                    <button
                      type="button"
                      onClick={() => setCountdown(30)}
                      className="text-brand font-semibold hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
                {errorMessage && (
                  <p className="text-xs text-destructive mt-1.5 font-medium">{errorMessage}</p>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-brand-soft/50 border border-brand/10 text-xs text-brand-dark flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-brand" />
                <span>Demo Code: Use <strong>1234</strong> to verify instantly.</span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting}
                >
                  <span>Verify & Sign In</span>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-5 border-t border-border/60">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">
                Quick 1-Click Demo Profiles
              </span>
              <Sparkles className="w-3.5 h-3.5 text-brand" />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("pat-101", "9845012345")}
                className="w-full text-left p-2.5 rounded-xl border border-border/80 bg-card hover:bg-lavender-soft transition-all text-xs flex items-center justify-between cursor-pointer group hover:border-brand/30"
              >
                <div>
                  <div className="font-semibold text-ink group-hover:text-brand transition-colors">
                    Ananya Sharma (32F)
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    Active IVF Antagonist Protocol • Day 9
                  </div>
                </div>
                <Badge variant="default" size="sm">
                  Recommended
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("pat-102", "9741288901")}
                className="w-full text-left p-2.5 rounded-xl border border-border/80 bg-card hover:bg-lavender-soft transition-all text-xs flex items-center justify-between cursor-pointer group hover:border-brand/30"
              >
                <div>
                  <div className="font-semibold text-ink group-hover:text-brand transition-colors">
                    Rahul Mehta (29M)
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    New Patient • Andrology Evaluation
                  </div>
                </div>
                <Badge variant="secondary" size="sm">
                  New Patient
                </Badge>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-[11px] text-ink-soft space-y-1">
        <p>SmrkoMed Healthcare Systems • Patient Experience Suite</p>
        <p className="text-[10px]">
          Demo Environment: No real SMS or external services invoked.
        </p>
      </div>
    </div>
  );
}
