"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Star,
  MapPin,
  Video,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  Building,
  GraduationCap,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatCurrency } from "@/lib/utils";

const SPECIALTY_OPTIONS = [
  "All Specialties",
  "Fertility & IVF",
  "Obstetrics & Gynaecology",
  "Andrology & Urology",
  "Genetics & Embryology",
  "General Physician",
  "Dermatology",
];

const CLINIC_BRANCHES = [
  "All Branches",
  "Indiranagar, Bengaluru",
  "Koramangala, Bengaluru",
  "Whitefield, Bengaluru",
];

const MODE_OPTIONS = [
  { id: "all", label: "All Modes" },
  { id: "video", label: "Video Consult" },
  { id: "in_clinic", label: "In-Clinic Visit" },
];

export default function FindDoctorsPage() {
  const router = useRouter();
  const { doctors } = usePatient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Filter logic
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesSpecialty = doc.specialty.toLowerCase().includes(q);
        const matchesSub = doc.subSpecialty.toLowerCase().includes(q);
        const matchesBranch = doc.clinicBranch.toLowerCase().includes(q);
        if (!matchesName && !matchesSpecialty && !matchesSub && !matchesBranch) {
          return false;
        }
      }

      // Specialty filter
      if (selectedSpecialty !== "All Specialties") {
        if (!doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase().split(" ")[0]!)) {
          return false;
        }
      }

      // Branch filter
      if (selectedBranch !== "All Branches") {
        if (!doc.clinicBranch.includes(selectedBranch.split(",")[0]!)) {
          return false;
        }
      }

      // Mode filter
      if (selectedMode !== "all") {
        if (!doc.availableModes.includes(selectedMode as any)) {
          return false;
        }
      }

      return true;
    });
  }, [doctors, searchQuery, selectedSpecialty, selectedBranch, selectedMode]);

  const activeFiltersCount =
    (selectedSpecialty !== "All Specialties" ? 1 : 0) +
    (selectedBranch !== "All Branches" ? 1 : 0) +
    (selectedMode !== "all" ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("All Specialties");
    setSelectedBranch("All Branches");
    setSelectedMode("all");
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Find Doctors & Specialists
        </h1>
        <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
          Consult India's top reproductive medicine, gynaecology, and fertility experts.
        </p>
      </div>

      {/* Search Bar & Filter Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctor name, specialty, or condition..."
            className="w-full bg-card rounded-2xl border border-border pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className="relative px-3.5 py-2.5 rounded-2xl border border-border bg-card text-ink-soft hover:text-ink hover:bg-lavender-soft transition-colors flex items-center gap-2 text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
          aria-label="Filter options"
        >
          <Filter className="w-4 h-4 text-brand" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Specialty Filter Horizontal Scroll Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SPECIALTY_OPTIONS.map((spec) => {
          const isSelected = selectedSpecialty === spec;
          return (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? "bg-brand text-white font-semibold shadow-xs"
                  : "bg-card border border-border text-ink-soft hover:text-ink hover:border-brand/30"
              }`}
            >
              {spec}
            </button>
          );
        })}
      </div>

      {/* Mode Toggle Chips */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mr-1">
          Mode:
        </span>
        {MODE_OPTIONS.map((m) => {
          const isSelected = selectedMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-brand-soft text-brand-dark font-semibold border border-brand/20"
                  : "bg-card/70 border border-border/80 text-ink-soft hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Doctors List */}
      <div className="space-y-4">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((doc) => (
            <Card
              key={doc.id}
              className="hover:border-brand/40 hover:shadow-soft transition-all overflow-hidden"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Doctor Info */}
                  <div className="flex items-start gap-3.5">
                    <Avatar
                      name={doc.name}
                      src={doc.avatarUrl}
                      size="lg"
                      className="ring-2 ring-brand/20 shrink-0"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-ink leading-tight">
                          {doc.prefix} {doc.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{doc.rating}</span>
                          <span className="text-[10px] text-ink-soft font-normal">
                            ({doc.reviewCount})
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-brand-dark mt-0.5">
                        {doc.specialty}
                      </p>

                      <p className="text-[11px] text-ink-soft flex items-center gap-1 mt-1">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-xs">{doc.qualifications}</span>
                        <span>•</span>
                        <span>{doc.experienceYears} yrs exp</span>
                      </p>

                      <p className="text-[11px] text-ink-soft flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-brand" />
                        <span>{doc.clinicBranch}</span>
                      </p>
                    </div>
                  </div>

                  {/* Fees & Availability Badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-ink-soft font-medium">Consultation Fee</div>
                      <div className="text-sm sm:text-base font-bold text-ink">
                        {formatCurrency(doc.videoFee)}
                        <span className="text-[10px] font-normal text-ink-soft ml-1">
                          (Video)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                      <Clock className="w-3 h-3" />
                      <span>{doc.nextAvailable}</span>
                    </div>
                  </div>
                </div>

                {/* About Snippet */}
                <p className="text-xs text-ink-soft mt-3.5 line-clamp-2 leading-relaxed bg-lavender-soft/40 p-2.5 rounded-xl border border-border/40">
                  {doc.about}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-4 mt-3 border-t border-border/50">
                  <Link
                    href={`/doctors/${doc.id}`}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-border bg-card text-ink text-xs font-semibold hover:bg-lavender-soft transition-colors text-center"
                  >
                    View Profile
                  </Link>

                  <Link
                    href={`/book?doctorId=${doc.id}`}
                    className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft hover:bg-brand-dark active:scale-[0.98] transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Book Appointment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 p-6 rounded-3xl border border-dashed border-border bg-lavender-soft/40">
            <Search className="w-10 h-10 text-ink-soft/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-ink">No doctors match your criteria</h3>
            <p className="text-xs text-ink-soft max-w-xs mx-auto mt-1 mb-4">
              Try adjusting your specialty, clinic branch, or consultation mode filters.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Doctors"
        description="Refine specialists by specialty, clinic branch, and consultation type"
      >
        <div className="space-y-5">
          {/* Specialty */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Specialty
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    selectedSpecialty === spec
                      ? "bg-brand text-white font-semibold"
                      : "bg-card border border-border text-ink-soft"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Clinic Branch */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Clinic Branch
            </label>
            <div className="flex flex-wrap gap-2">
              {CLINIC_BRANCHES.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBranch(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    selectedBranch === b
                      ? "bg-brand text-white font-semibold"
                      : "bg-card border border-border text-ink-soft"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Consultation Mode */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Consultation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className={`p-2.5 rounded-xl text-xs font-medium text-center cursor-pointer transition-colors ${
                    selectedMode === m.id
                      ? "bg-brand text-white font-semibold"
                      : "bg-card border border-border text-ink-soft"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => {
                resetFilters();
                setIsFilterSheetOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setIsFilterSheetOpen(false)}
            >
              Apply Filters ({filteredDoctors.length} Doctors)
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
