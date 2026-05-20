"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { List, ListOrdered } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  borderColor?: string;
  bgColor?: string;
  toolbarColor?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  disabled = false,
  borderColor = "border-yellow-300",
  bgColor = "bg-yellow-100",
  toolbarColor = "text-yellow-800",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipSync = useRef(false);

  useEffect(() => {
    if (editorRef.current && !skipSync.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      skipSync.current = true;
      onChange(editorRef.current.innerHTML);
      requestAnimationFrame(() => { skipSync.current = false; });
    }
  }, [onChange]);

  const execFormat = (command: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, undefined);
    handleInput();
  };

  const btnClass = `w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors ${toolbarColor}`;

  return (
    <div className={`border ${borderColor} rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-yellow-500`}>
      <div className={`flex items-center gap-0.5 px-2 py-1 ${bgColor} border-b ${borderColor}`}>
        <button type="button" onClick={() => execFormat("bold")} className={btnClass} title="Bold">
          <span className="text-[11px] font-black">B</span>
        </button>
        <button type="button" onClick={() => execFormat("italic")} className={btnClass} title="Italic">
          <span className="text-[11px] italic font-semibold">I</span>
        </button>
        <button type="button" onClick={() => execFormat("underline")} className={btnClass} title="Underline">
          <span className="text-[11px] underline font-semibold">U</span>
        </button>
        <div className={`w-px h-4 ${bgColor} opacity-40 mx-1 bg-current`} />
        <button type="button" onClick={() => execFormat("insertUnorderedList")} className={btnClass} title="Bulleted list">
          <List className="h-3 w-3" />
        </button>
        <button type="button" onClick={() => execFormat("insertOrderedList")} className={btnClass} title="Numbered list">
          <ListOrdered className="h-3 w-3" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`min-h-[4rem] text-xs px-3 py-2 focus:outline-none
          [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
      />
    </div>
  );
}
