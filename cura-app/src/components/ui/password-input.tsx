"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Chrome / Edge paint password inputs with a yellow-ish "password manager"
 * tint and autofilled inputs with a blue tint. These rules repaint the
 * field white in every state so the component matches the rest of the form.
 * Scoped via the `password-input` class so it only affects this component.
 */
const AUTOFILL_OVERRIDE_CSS = `
  .password-input input:-webkit-autofill,
  .password-input input:-webkit-autofill:hover,
  .password-input input:-webkit-autofill:focus,
  .password-input input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
    box-shadow: 0 0 0 1000px #ffffff inset !important;
    -webkit-text-fill-color: inherit !important;
    caret-color: inherit !important;
    transition: background-color 9999s ease-in-out 0s;
  }
`;

/**
 * Drop-in replacement for `<Input type="password" />` that adds an eye-icon
 * toggle to reveal / hide the entered value. Forwards every native input
 * prop (including refs) to the underlying `<Input>` so it can be used
 * anywhere the standard component is.
 */
export interface PasswordInputProps extends Omit<InputProps, "type"> {}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const Icon = visible ? EyeOff : Eye;

    return (
      <div className="relative password-input">
        {/* One-time style injection to neutralise Chrome's password tint. */}
        <style>{AUTOFILL_OVERRIDE_CSS}</style>
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          // Reserve room on the right for the toggle button so the eye
          // never overlaps the typed value. `bg-white` ensures the field
          // matches the other inputs even inside a tinted card.
          className={cn("pr-9 bg-white", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-secondary transition-colors focus:outline-none focus:ring-1 focus:ring-secondary/40"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
