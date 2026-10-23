"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Share2,
  Eye,
  CheckCircle2,
  X,
  FileCheck,
  AlertCircle,
  Pill,
  Activity,
  Layers,
  Calendar,
  Sparkles,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { HealthRecord, RecordCategory } from "@/data/mock-records";
import { toast } from "sonner";

const CATEGORIES: { id: RecordCategory; label: string }[] = [
  { id: "all", label: "All Records" },
  { id: "scan", label: "Ultrasound & Scans" },
  { id: "lab_report", label: "Lab Reports" },
  { id: "prescription", label: "Prescriptions" },
  { id: "summary", label: "Consultation Summaries" },
  { id: "uploaded", label: "My Uploads" },
];

export default function HealthRecordsPage() {
  const { records, uploadRecord } = usePatient();

  const [selectedCategory, setSelectedCategory] = useState<RecordCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<HealthRecord | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<RecordCategory>("lab_report");
  const [uploadDoctor, setUploadDoctor] = useState("External Diagnostic Center");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "uploaded") {
          if (!r.isUploadedByUser) return false;
        } else if (r.category !== selectedCategory) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDoc = r.doctorName.toLowerCase().includes(q);
        const matchesTags = r.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDoc && !matchesTags) return false;
      }

      return true;
    });
  }, [records, selectedCategory, searchQuery]);

  const handleStartUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const step1 = setTimeout(() => setUploadProgress(45), 250);
    const step2 = setTimeout(() => setUploadProgress(85), 500);
    const step3 = setTimeout(() => {
      setUploadProgress(100);
      setIsUploading(false);

      uploadRecord({
        title: uploadTitle.trim(),
        category: uploadCategory,
        categoryLabel:
          uploadCategory === "scan"
            ? "Ultrasound & Scan"
            : uploadCategory === "prescription"
            ? "Prescription"
            : uploadCategory === "summary"
            ? "Consultation Summary"
            : "Laboratory Report",
        doctorName: uploadDoctor.trim() || "External Diagnostic Center",
        facility: "Uploaded by Patient (Portal App)",
        fileSize: uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        fileType: "pdf",
        tags: ["Patient Upload", uploadCategory],
        findingsSummary: "Document uploaded by patient for clinical review by treating physician.",
        clinicalDetails: {
          patientName: "Ananya Sharma",
          uhid: "SM-2026-8812",
          orderedBy: uploadDoctor,
          sampleDate: new Date().toLocaleDateString("en-IN"),
          notes: "Uploaded by patient via portal interface.",
        },
      });

      setIsUploadModalOpen(false);
      setUploadTitle("");
      setUploadProgress(0);
      setUploadFile(null);
    }, 850);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  const handleSimulateDownload = (rec: HealthRecord) => {
    toast.success("Downloading Document (Simulated)", {
      description: `${rec.title}.pdf (${rec.fileSize})`,
    });
  };

  const handleShareWithDoctor = (rec: HealthRecord) => {
    toast.info("Document Shared with Care Team", {
      description: `"${rec.title}" is now pinned in your doctor's review tray.`,
    });
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Health Records & Reports
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Access your lab tests, ultrasound scans, prescriptions, and external medical files.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsUploadModalOpen(true)}
          className="shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Record</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title, doctor, or test name..."
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

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-brand text-white font-semibold shadow-xs"
                    : "bg-card border border-border text-ink-soft hover:text-ink hover:border-brand/30"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Records Grid / List */}
      <div className="space-y-3.5">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((rec) => (
            <Card
              key={rec.id}
              className="hover:border-brand/40 hover:shadow-soft transition-all overflow-hidden"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Record title & meta */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-brand/10">
                      {rec.category === "scan" ? (
                        <Activity className="w-5 h-5 text-brand" />
                      ) : rec.category === "prescription" ? (
                        <Pill className="w-5 h-5 text-brand" />
                      ) : rec.category === "summary" ? (
                        <FileCheck className="w-5 h-5 text-brand" />
                      ) : (
                        <FileText className="w-5 h-5 text-brand" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-ink leading-tight">
                          {rec.title}
                        </h3>
                        <Badge
                          variant={
                            rec.category === "scan"
                              ? "blue"
                              : rec.category === "prescription"
                              ? "peach"
                              : "secondary"
                          }
                          size="sm"
                        >
                          {rec.categoryLabel}
                        </Badge>
                      </div>

                      <p className="text-xs text-ink-soft mt-1">
                        Ordered by <strong className="text-ink">{rec.doctorName}</strong> • {rec.facility}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-ink-soft mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {rec.date}
                        </span>
                        <span>•</span>
                        <span>{rec.fileSize}</span>
                        <span>•</span>
                        <span className="uppercase">{rec.fileType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 self-end sm:self-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedRecordForPreview(rec)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSimulateDownload(rec)}
                      aria-label="Download document"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareWithDoctor(rec)}
                      aria-label="Share document"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Findings summary snippet */}
                {rec.findingsSummary && (
                  <p className="text-xs text-ink-soft bg-lavender-soft/40 p-2.5 rounded-xl border border-border/40 mt-3 line-clamp-2 leading-relaxed">
                    <span className="font-semibold text-ink">Summary: </span>
                    {rec.findingsSummary}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-brand" />}
            title="No Records Found"
            description="No health records match your current search or category filter. Upload outside reports or clear your filters."
            actionText="Upload a Document"
            onAction={() => setIsUploadModalOpen(true)}
          />
        )}
      </div>

      {/* Document Clinical Preview Modal */}
      {selectedRecordForPreview && (
        <Modal
          isOpen={!!selectedRecordForPreview}
          onClose={() => setSelectedRecordForPreview(null)}
          title={selectedRecordForPreview.title}
          description={`${selectedRecordForPreview.categoryLabel} • Dated ${selectedRecordForPreview.date}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Header clinical strip */}
            <div className="p-3.5 rounded-2xl bg-lavender-soft border border-border/70 flex justify-between items-center">
              <div>
                <p className="font-bold text-ink">
                  {selectedRecordForPreview.clinicalDetails?.patientName || "Ananya Sharma"}
                </p>
                <p className="text-ink-soft text-[11px]">
                  UHID: {selectedRecordForPreview.clinicalDetails?.uhid || "SM-2026-8812"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-brand-dark">
                  {selectedRecordForPreview.doctorName}
                </p>
                <p className="text-ink-soft text-[11px]">{selectedRecordForPreview.facility}</p>
              </div>
            </div>

            {/* If Ultrasound scan details */}
            {selectedRecordForPreview.clinicalDetails?.scanDetails && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-1.5 font-bold text-ink text-sm pb-2 border-b border-border/50">
                  <Activity className="w-4 h-4 text-brand" />
                  <span>Transvaginal Pelvic Ultrasound Findings</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-lavender-soft/40">
                    <span className="text-ink-soft font-medium">Endometrial Thickness</span>
                    <p className="font-bold text-ink mt-0.5">
                      {selectedRecordForPreview.clinicalDetails.scanDetails.endometrialThickness}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-lavender-soft/40">
                    <span className="text-ink-soft font-medium">Modality</span>
                    <p className="font-bold text-ink mt-0.5">
                      {selectedRecordForPreview.clinicalDetails.scanDetails.modality}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-lavender-soft/40">
                  <span className="text-ink-soft font-medium">Right Ovary Cohort</span>
                  <p className="font-semibold text-ink mt-0.5">
                    {selectedRecordForPreview.clinicalDetails.scanDetails.rightOvaryFollicles}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-lavender-soft/40">
                  <span className="text-ink-soft font-medium">Left Ovary Cohort</span>
                  <p className="font-semibold text-ink mt-0.5">
                    {selectedRecordForPreview.clinicalDetails.scanDetails.leftOvaryFollicles}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-brand-soft/40 border border-brand/20">
                  <span className="text-brand-dark font-bold">Impression & Clinical Advice</span>
                  <p className="text-ink mt-0.5 leading-relaxed">
                    {selectedRecordForPreview.clinicalDetails.scanDetails.impression}
                  </p>
                </div>
              </div>
            )}

            {/* If Lab parameters table */}
            {selectedRecordForPreview.clinicalDetails?.parameters && (
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-lavender-soft font-semibold text-ink">
                    <tr>
                      <th className="p-2.5">Investigation</th>
                      <th className="p-2.5">Result</th>
                      <th className="p-2.5 hidden sm:table-cell">Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {selectedRecordForPreview.clinicalDetails.parameters.map((p) => (
                      <tr key={p.name} className="hover:bg-lavender-soft/30">
                        <td className="p-2.5 font-medium text-ink">{p.name}</td>
                        <td className="p-2.5 font-bold text-brand">
                          {p.value} {p.unit}
                        </td>
                        <td className="p-2.5 text-ink-soft hidden sm:table-cell text-[11px]">
                          {p.referenceRange}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* If Prescription items */}
            {selectedRecordForPreview.clinicalDetails?.prescriptionItems && (
              <div className="space-y-2.5">
                <div className="font-bold text-ink text-xs uppercase tracking-wider">
                  Prescribed Medications
                </div>
                {selectedRecordForPreview.clinicalDetails.prescriptionItems.map((item) => (
                  <div
                    key={item.medicineName}
                    className="p-3 rounded-xl border border-border bg-card space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-brand-dark">{item.medicineName}</span>
                      <Badge variant="secondary" size="sm">
                        {item.dosage}
                      </Badge>
                    </div>
                    <p className="text-ink-soft">
                      {item.frequency} • {item.duration}
                    </p>
                    <p className="text-[11px] text-ink font-medium bg-lavender-soft/50 p-1.5 rounded-lg">
                      Instructions: {item.instructions}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Modal actions */}
            <div className="flex gap-2.5 pt-3 border-t border-border">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => handleSimulateDownload(selectedRecordForPreview)}
              >
                <Download className="w-4 h-4" />
                <span>Download Report PDF</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedRecordForPreview(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Local Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isUploading && setIsUploadModalOpen(false)}
        title="Upload Medical Document"
        description="Add previous lab tests, scan images, or outside hospital summaries to your profile."
      >
        <form onSubmit={handleStartUpload} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g., Day 3 Hormone Blood Test, Outside Laparoscopy Discharge"
              className="w-full p-2.5 rounded-xl border border-border bg-card text-ink text-xs focus:ring-2 focus:ring-brand/30 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-ink block mb-1">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as RecordCategory)}
                className="w-full p-2.5 rounded-xl border border-border bg-card text-ink text-xs focus:ring-2 focus:ring-brand/30 outline-none"
              >
                <option value="lab_report">Lab Report</option>
                <option value="scan">Ultrasound / Scan</option>
                <option value="prescription">Prescription</option>
                <option value="summary">Discharge / Summary</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-ink block mb-1">Doctor / Lab Name</label>
              <input
                type="text"
                value={uploadDoctor}
                onChange={(e) => setUploadDoctor(e.target.value)}
                placeholder="Diagnostic center"
                className="w-full p-2.5 rounded-xl border border-border bg-card text-ink text-xs focus:ring-2 focus:ring-brand/30 outline-none"
              />
            </div>
          </div>

          {/* Simulated File Drop area */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-lavender-soft/40 text-center space-y-2">
            <Upload className="w-8 h-8 text-brand mx-auto opacity-80" />
            <p className="font-semibold text-ink">
              {uploadFile ? uploadFile.name : "Select or drag file here"}
            </p>
            <p className="text-[11px] text-ink-soft">
              Supports PDF, PNG, JPG up to 25MB (Encrypted prototype upload)
            </p>
            <input
              type="file"
              onChange={(e) => e.target.files && setUploadFile(e.target.files[0] || null)}
              className="text-xs text-ink-soft cursor-pointer mx-auto block mt-2"
            />
          </div>

          {/* Progress bar if uploading */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-ink font-semibold">
                <span>Uploading & verifying encryption...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isUploading}
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={isUploading}
            >
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
