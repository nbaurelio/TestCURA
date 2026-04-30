"use client";

import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const MEDICAL_ALERT_SUGGESTIONS = [
  "Allergic Rhinitis",
  "Anemia",
  "Anticoagulant Therapy",
  "Artificial Heart Valve",
  "Aspirin Therapy",
  "Asthma",
  "Bisphosphonate Use",
  "Bleeding Disorder",
  "Blood Pressure Medication",
  "Cancer",
  "Chemotherapy",
  "Corticosteroid Use",
  "Diabetes Mellitus",
  "Drug Allergy",
  "Epilepsy",
  "Heart Disease",
  "Hepatitis B",
  "Hepatitis C",
  "HIV/AIDS",
  "Hypertension",
  "Immunocompromised",
  "Kidney Disease",
  "Latex Allergy",
  "Leukemia",
  "Liver Disease",
  "Osteoporosis",
  "Pacemaker",
  "Penicillin Allergy",
  "Pregnancy",
  "Radiation Therapy",
  "Sickle Cell Disease",
  "Stroke",
  "Thyroid Disorder",
  "Warfarin Therapy",
];

interface MedicalAlertTagInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  borderClass?: string;
  focusClass?: string;
}

export function MedicalAlertTagInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Type an alert and press Enter...",
  borderClass = "border-red-300",
  focusClass = "focus:ring-red-500",
}: MedicalAlertTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tags = value
    ? value.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const newTags = [...tags, trimmed];
    onChange(newTags.join(", "));
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(", "));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setHighlightedIndex(-1);
    if (val.trim().length > 0) {
      const filtered = MEDICAL_ALERT_SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().startsWith(val.toLowerCase()) &&
          !tags.includes(s)
      );
      setSuggestions(filtered.slice(0, 6));
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        addTag(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`min-h-[36px] w-full px-2 py-1.5 border ${borderClass} rounded-lg bg-white flex flex-wrap gap-1 cursor-text ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : ""}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-secondary text-white text-[10px] font-semibold px-2 py-0.5 rounded-md"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                className="hover:bg-white/20 rounded-sm p-0.5 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.trim() && suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder={tags.length === 0 ? placeholder : ""}
            className={`flex-1 min-w-[120px] text-xs outline-none bg-transparent placeholder:text-gray-400 ${focusClass}`}
            disabled={disabled}
          />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-red-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                i === highlightedIndex
                  ? "bg-secondary text-white"
                  : "text-gray-700 hover:bg-red-50"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
