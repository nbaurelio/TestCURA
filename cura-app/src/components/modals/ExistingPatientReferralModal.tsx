"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { createReferral, ReferralFormData } from "@/lib/api/referrals";
import { filterTaxonomy } from "@/lib/data/filterTaxonomy";
import { supabase } from "@/lib/supabase";

interface ExistingPatientReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const emptyForm = (): ReferralFormData => ({
  chart_number: "",
  treatment: "",
  age: undefined,
  medical_alert: "",
  clinical_section_origin: "",
  clinical_discipline_origin: "",
  treatment_service_origin: "",
  clinical_section_destination: "",
  clinical_discipline_destination: "",
  treatment_service_destination: "",
  medical_history: "",
  tentative_appointment_schedule: "",
  notes_and_special_indications: "",
});

export function ExistingPatientReferralModal({
  open,
  onOpenChange,
  onSave,
}: ExistingPatientReferralModalProps) {
  const [formData, setFormData] = useState<ReferralFormData>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "not_found">("idle");

  // Origin cascading filter state
  const [originSection, setOriginSection] = useState("");
  const [originDiscipline, setOriginDiscipline] = useState("");
  const [originTreatment, setOriginTreatment] = useState("");

  // Destination cascading filter state
  const [destSection, setDestSection] = useState("");
  const [destDiscipline, setDestDiscipline] = useState("");
  const [destTreatment, setDestTreatment] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setFormData(emptyForm());
      setOriginSection(""); setOriginDiscipline(""); setOriginTreatment("");
      setDestSection(""); setDestDiscipline(""); setDestTreatment("");
      setLookupStatus("idle");
      setError(null);
    }
  }, [open]);

  const handleChange = (field: keyof ReferralFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill patient fields when chart number is typed
  const handleChartNumberChange = (value: string) => {
    handleChange("chart_number", value);
    setLookupStatus("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) return;

    debounceRef.current = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const referralsTable = supabase.from("referrals") as any;
        const { data, error: lookupError } = await referralsTable
          .select("treatment, age, medical_alert, medical_history, notes_and_special_indications")
          .eq("chart_number", value.trim())
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (data) {
          setFormData(prev => ({
            ...prev,
            treatment: data.treatment ?? "",
            age: data.age ?? undefined,
            medical_alert: data.medical_alert ?? "",
            medical_history: data.medical_history ?? "",
            notes_and_special_indications: data.notes_and_special_indications ?? "",
          }));
          setLookupStatus("found");
        } else {
          setLookupStatus("not_found");
        }
      } catch (e) {
        console.error("Chart number lookup error:", e);
        setLookupStatus("not_found");
      } finally {
        setLookupLoading(false);
      }
    }, 600);
  };

  // Origin filter handlers
  const handleOriginSectionChange = (sectionId: string) => {
    setOriginSection(sectionId);
    setOriginDiscipline("");
    setOriginTreatment("");
    const section = filterTaxonomy.find(s => s.id === sectionId);
    setFormData(prev => ({
      ...prev,
      clinical_section_origin: section?.shortName || "",
      clinical_discipline_origin: "",
      treatment_service_origin: ""
    }));
  };

  const handleOriginDisciplineChange = (disciplineId: string) => {
    setOriginDiscipline(disciplineId);
    setOriginTreatment("");
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === disciplineId);
    setFormData(prev => ({
      ...prev,
      clinical_discipline_origin: discipline?.name || "",
      treatment_service_origin: ""
    }));
  };

  const handleOriginTreatmentChange = (treatmentId: string) => {
    setOriginTreatment(treatmentId);
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === originDiscipline);
    const treatment = discipline?.treatmentServices.find(t => t.id === treatmentId);
    setFormData(prev => ({
      ...prev,
      treatment_service_origin: treatment?.name || ""
    }));
  };

  // Destination filter handlers
  const handleDestSectionChange = (sectionId: string) => {
    setDestSection(sectionId);
    setDestDiscipline("");
    setDestTreatment("");
    const section = filterTaxonomy.find(s => s.id === sectionId);
    setFormData(prev => ({
      ...prev,
      clinical_section_destination: section?.shortName || "",
      clinical_discipline_destination: "",
      treatment_service_destination: ""
    }));
  };

  const handleDestDisciplineChange = (disciplineId: string) => {
    setDestDiscipline(disciplineId);
    setDestTreatment("");
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === disciplineId);
    setFormData(prev => ({
      ...prev,
      clinical_discipline_destination: discipline?.name || "",
      treatment_service_destination: ""
    }));
  };

  const handleDestTreatmentChange = (treatmentId: string) => {
    setDestTreatment(treatmentId);
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === destDiscipline);
    const treatment = discipline?.treatmentServices.find(t => t.id === treatmentId);
    setFormData(prev => ({
      ...prev,
      treatment_service_destination: treatment?.name || ""
    }));
  };

  // Get available disciplines / treatments
  const getOriginDisciplines = () => {
    if (!originSection) return [];
    const section = filterTaxonomy.find(s => s.id === originSection);
    return section?.clinicalDisciplines || [];
  };

  const getOriginTreatments = () => {
    if (!originSection || !originDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === originSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === originDiscipline);
    return discipline?.treatmentServices || [];
  };

  const getDestDisciplines = () => {
    if (!destSection) return [];
    const section = filterTaxonomy.find(s => s.id === destSection);
    return section?.clinicalDisciplines || [];
  };

  const getDestTreatments = () => {
    if (!destSection || !destDiscipline) return [];
    const section = filterTaxonomy.find(s => s.id === destSection);
    const discipline = section?.clinicalDisciplines.find(d => d.id === destDiscipline);
    return discipline?.treatmentServices || [];
  };

  const handleSave = async () => {
    if (!formData.chart_number.trim()) {
      setError("Please enter a chart number.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await createReferral(formData, true);
      onSave?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving referral:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save referral";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#f5f0e1] max-w-[420px] w-[95vw] max-h-[90vh] p-0 gap-0 rounded-lg overflow-hidden border-2 border-primary [&>button]:hidden">
        {/* Header */}
        <div className="bg-secondary p-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">CREATE REFERRAL</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-6 h-6 border-2 border-white rounded flex items-center justify-center hover:bg-white/10"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3 max-h-[calc(90vh-120px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
              {error}
            </div>
          )}

          {/* Chart Number with lookup indicator */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
            <label className="text-xs text-gray-700">Chart Number</label>
            <div className="relative">
              <input
                type="text"
                value={formData.chart_number}
                onChange={(e) => handleChartNumberChange(e.target.value)}
                placeholder="e.g. 2026-00001"
                className={`h-7 w-full px-2 pr-7 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                  lookupStatus === "found"
                    ? "border-green-400 bg-green-50"
                    : lookupStatus === "not_found"
                    ? "border-red-400"
                    : "border-gray-300"
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                {lookupLoading ? (
                  <span className="text-gray-400 animate-pulse">…</span>
                ) : lookupStatus === "found" ? (
                  <span className="text-green-500">✓</span>
                ) : lookupStatus === "not_found" ? (
                  <span className="text-red-400">✗</span>
                ) : (
                  <Search className="h-3 w-3 text-gray-400" />
                )}
              </span>
            </div>
          </div>

          {lookupStatus === "not_found" && (
            <p className="text-xs text-red-500 -mt-1 ml-[148px] sm:ml-[188px]">Chart number not found.</p>
          )}
          {lookupStatus === "found" && (
            <p className="text-xs text-green-600 -mt-1 ml-[148px] sm:ml-[188px]">Patient details loaded.</p>
          )}

          {/* Treatment (auto-filled, still editable) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
            <label className="text-xs text-gray-700">Treatment</label>
            <input
              type="text"
              value={formData.treatment}
              onChange={(e) => handleChange("treatment", e.target.value)}
              readOnly={lookupStatus !== "found"}
              className={`h-7 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                lookupStatus === "found" ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            />
          </div>

          {/* Age (auto-filled, still editable) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
            <label className="text-xs text-gray-700">Age</label>
            <input
              type="number"
              min="1"
              max="99"
              placeholder="1-99"
              value={formData.age || ""}
              onChange={(e) => handleChange("age", parseInt(e.target.value) || 0)}
              readOnly={lookupStatus !== "found"}
              className={`h-7 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                lookupStatus === "found" ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            />
          </div>

          {/* Medical Alert (auto-filled, still editable) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
            <label className="text-xs text-gray-700">Medical Alert</label>
            <input
              type="text"
              value={formData.medical_alert}
              onChange={(e) => handleChange("medical_alert", e.target.value)}
              readOnly={lookupStatus !== "found"}
              className={`h-7 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                lookupStatus === "found" ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            />
          </div>

          {/* Clinical Section of Origin - Cascading Filters */}
          <div className="space-y-2">
            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
              <label className="text-xs text-gray-700">Clinical Section of Origin</label>
              <div className="relative">
                <select
                  value={originSection}
                  onChange={(e) => handleOriginSectionChange(e.target.value)}
                  className="h-7 w-full px-2 pr-8 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                >
                  <option value="">Select Clinical Section</option>
                  {filterTaxonomy.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.shortName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
              <label className="text-xs text-gray-700">Clinical Discipline</label>
              <div className="relative">
                <select
                  value={originDiscipline}
                  onChange={(e) => handleOriginDisciplineChange(e.target.value)}
                  disabled={!originSection}
                  className={`h-7 w-full px-2 pr-8 text-xs border rounded appearance-none ${
                    originSection
                      ? "bg-white border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={!originSection ? "Please select Clinical Section first" : ""}
                >
                  <option value="">Select Clinical Discipline</option>
                  {getOriginDisciplines().map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${originSection ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
              <label className="text-xs text-gray-700">Treatment Service</label>
              <div className="relative">
                <select
                  value={originTreatment}
                  onChange={(e) => handleOriginTreatmentChange(e.target.value)}
                  disabled={!originSection || !originDiscipline}
                  className={`h-7 w-full px-2 pr-8 text-xs border rounded appearance-none ${
                    originSection && originDiscipline
                      ? "bg-white border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={!originSection || !originDiscipline ? "Please select Clinical Section and Clinical Discipline first" : ""}
                >
                  <option value="">Select Treatment Service</option>
                  {getOriginTreatments().map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${originSection && originDiscipline ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            </div>
          </div>

          {/* Clinical Section of Destination - Cascading Filters */}
          <div className="space-y-2">
            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
              <label className="text-xs text-gray-700">Clinical Section of Destination</label>
              <div className="relative">
                <select
                  value={destSection}
                  onChange={(e) => handleDestSectionChange(e.target.value)}
                  className="h-7 w-full px-2 pr-8 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                >
                  <option value="">Select Clinical Section</option>
                  {filterTaxonomy.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.shortName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
              <label className="text-xs text-gray-700">Clinical Discipline</label>
              <div className="relative">
                <select
                  value={destDiscipline}
                  onChange={(e) => handleDestDisciplineChange(e.target.value)}
                  disabled={!destSection}
                  className={`h-7 w-full px-2 pr-8 text-xs border rounded appearance-none ${
                    destSection
                      ? "bg-white border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={!destSection ? "Please select Clinical Section first" : ""}
                >
                  <option value="">Select Clinical Discipline</option>
                  {getDestDisciplines().map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${destSection ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
              <label className="text-xs text-gray-700">Treatment Service</label>
              <div className="relative">
                <select
                  value={destTreatment}
                  onChange={(e) => handleDestTreatmentChange(e.target.value)}
                  disabled={!destSection || !destDiscipline}
                  className={`h-7 w-full px-2 pr-8 text-xs border rounded appearance-none ${
                    destSection && destDiscipline
                      ? "bg-white border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={!destSection || !destDiscipline ? "Please select Clinical Section and Clinical Discipline first" : ""}
                >
                  <option value="">Select Treatment Service</option>
                  {getDestTreatments().map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${destSection && destDiscipline ? "text-gray-500" : "text-gray-400"}`} />
              </div>
            </div>
          </div>

          {/* Medical History (auto-filled, still editable) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-start gap-2">
            <label className="text-xs text-gray-700 pt-1">Medical History</label>
            <textarea
              rows={3}
              value={formData.medical_history}
              onChange={(e) => handleChange("medical_history", e.target.value)}
              readOnly={lookupStatus !== "found"}
              className={`px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none ${
                lookupStatus === "found" ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            />
          </div>

          {/* Tentative Appointment Schedule (always blank - user must fill) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-2">
            <label className="text-xs text-gray-700">Tentative Appointment Schedule</label>
            <input
              type="datetime-local"
              value={formData.tentative_appointment_schedule}
              onChange={(e) => handleChange("tentative_appointment_schedule", e.target.value)}
              className="h-7 w-full px-2 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Notes and Special Indications (auto-filled, still editable) */}
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-start gap-2">
            <label className="text-xs text-gray-700 pt-1">Notes and Special Indications</label>
            <textarea
              rows={3}
              value={formData.notes_and_special_indications}
              onChange={(e) => handleChange("notes_and_special_indications", e.target.value)}
              readOnly={lookupStatus !== "found"}
              className={`px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none ${
                lookupStatus === "found" ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 flex justify-end gap-3 sticky bottom-0 bg-[#f5f0e1] border-t border-gray-300">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-1.5 bg-secondary text-white text-xs font-semibold rounded hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "SAVING..." : "SAVE"}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 text-secondary text-xs font-semibold hover:underline"
          >
            CANCEL
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
