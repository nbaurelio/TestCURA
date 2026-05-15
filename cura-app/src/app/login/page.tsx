"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import Image from "next/image";
import { getProfile, getProfileByEmail, updateProfile } from "@/lib/api/profiles";
import { useAuth } from "@/context/AuthContext";

/**
 * Number of consecutive wrong-password attempts before the account is
 * automatically locked. This is distinct from user-initiated deactivation —
 * LOCKED means "security lockout", INACTIVE means "user opted out".
 */
const MAX_LOGIN_ATTEMPTS = 5;

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  // Test accounts for development
  const TEST_ACCOUNTS: Record<string, string> = {
    "test@example.com": "00000000-0000-0000-0000-000000000000",
    "juan@example.com": "11111111-1111-1111-1111-111111111111",
    "prof1@example.com": "22222222-2222-2222-2222-222222222222",
    "prof2@example.com": "33333333-3333-3333-3333-333333333333",
    "carlos@example.com": "aaaa1111-1111-1111-1111-111111111111",
    "maria.c@example.com": "aaaa2222-2222-2222-2222-222222222222",
    "jose@example.com": "aaaa3333-3333-3333-3333-333333333333",
    "anna@example.com": "bbbb1111-1111-1111-1111-111111111111",
    "miguel@example.com": "bbbb2222-2222-2222-2222-222222222222",
    "sarah@example.com": "bbbb3333-3333-3333-3333-333333333333",
    "admin@example.com": "cccc0000-0000-0000-0000-000000000000",
    "sysadmin@example.com": "dddd0000-0000-0000-0000-000000000000",
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoggingIn(true);
    setError("");

    // Look up the account by the email entered. This is what makes the
    // System Admin's "Edit Profile" credentials authoritative — change the
    // email in the dialog and the user logs in with the new email next time.
    const profile = await getProfileByEmail(email);

    // Backwards-compat: legacy seed accounts may exist in TEST_ACCOUNTS but
    // not yet have an email row in the database, or have a NULL password
    // column. Fall back to the hardcoded map so existing flows keep working.
    let resolvedProfile = profile;
    if (!resolvedProfile) {
      const fallbackId = TEST_ACCOUNTS[email.toLowerCase()];
      if (fallbackId) resolvedProfile = await getProfile(fallbackId);
    }

    if (!resolvedProfile) {
      setError("Account not found.");
      setIsLoggingIn(false);
      return;
    }

    // ── Status gates ────────────────────────────────────────────────────
    // Checked BEFORE the password so a locked-out attacker can't keep
    // burning attempts and the user gets the most accurate reason.
    const status = (resolvedProfile as any).status;
    if (status === "INACTIVE") {
      setError("This account has been deactivated. Contact an administrator to reactivate it.");
      setIsLoggingIn(false);
      return;
    }
    if (status === "LOCKED") {
      setError(`This account is locked after ${MAX_LOGIN_ATTEMPTS} failed login attempts. Contact an administrator to unlock it.`);
      setIsLoggingIn(false);
      return;
    }

    // ── Password verification with auto-lock ────────────────────────────
    // NULL/undefined password means the profile is in legacy/mock mode and
    // accepts any password — those accounts skip the counter entirely.
    const storedPassword = (resolvedProfile as any).password;
    if (storedPassword && storedPassword !== password) {
      const prevAttempts = (resolvedProfile as any).failed_login_attempts ?? 0;
      const nextAttempts = prevAttempts + 1;

      if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Hit the threshold — flip the account to LOCKED and stop counting.
        await updateProfile(resolvedProfile.id, {
          failed_login_attempts: nextAttempts,
          status: "LOCKED",
        } as any);
        setError(`Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Contact an administrator to unlock it.`);
      } else {
        await updateProfile(resolvedProfile.id, {
          failed_login_attempts: nextAttempts,
        } as any);
        const remaining = MAX_LOGIN_ATTEMPTS - nextAttempts;
        setError(`Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before this account is locked.`);
      }
      setIsLoggingIn(false);
      return;
    }

    // ── Successful login ────────────────────────────────────────────────
    // Reset the counter so partial failures don't carry across sessions and
    // bump `last_active_at` so the inactivity check (1-year auto-INACTIVE
    // in the System Admin users page) sees a fresh activity timestamp.
    const loginUpdates: Record<string, any> = { last_active_at: new Date().toISOString() };
    if (((resolvedProfile as any).failed_login_attempts ?? 0) > 0) {
      loginUpdates.failed_login_attempts = 0;
    }
    await updateProfile(resolvedProfile.id, loginUpdates as any);

    // Store the resolved user ID and refresh auth context.
    localStorage.setItem("currentUserId", resolvedProfile.id);
    await refreshUser();
    const profileForRedirect = resolvedProfile;

    // Trigger exit animation
    setWelcomeName(profileForRedirect.first_name || "User");
    setIsTransitioning(true);

    // Wait for animation, then redirect based on the resolved profile.
    setTimeout(() => {
      if (profileForRedirect.role === "clinical_admin") {
        router.replace("/clinical-admin");
      } else if (profileForRedirect.role === "professor") {
        router.replace("/professor");
      } else if (profileForRedirect.role === "system_admin") {
        router.replace("/system-admin");
      } else {
        router.replace("/home");
      }
    }, 2200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cura-wallpaper.png)" }}
      />
      {/* Teal overlay */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: "rgba(135,196,216,0.7)" }} />

      {/* Transition overlay — logo zoom + welcome */}
      {isTransitioning && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out]">
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/cura-wallpaper.png)" }} />
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(135,196,216,0.85)" }} />
          <div className="relative z-10 animate-[logoZoom_2s_ease-in-out_forwards]">
            <Image
              src="/CURA_Full_WhiteTooth.png"
              alt="CURA Logo"
              width={200}
              height={68}
              className="object-contain drop-shadow-2xl"
            />
          </div>
          <p className="relative z-10 text-white font-bold text-sm uppercase tracking-widest mt-5 animate-[fadeInOut_2s_ease-in-out_forwards]">
            Welcome, {welcomeName}
          </p>
        </div>
      )}

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-[300px] mx-auto px-2 -mt-32 transition-all duration-[1200ms] ease-in-out"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? "scale(0.95) translateY(-20px)" : "scale(1) translateY(0)",
        }}
      >

        {/* CURA Logo */}
        <div className="flex justify-center mb-1 animate-[fadeInDown_0.6s_ease-out]">
          <Image
            src="/CURA_Full_WhiteTooth.png"
            alt="CURA Logo"
            width={200}
            height={68}
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        {/* Login Card */}
        <div className="bg-white/85 backdrop-blur-md rounded-lg shadow-xl border border-white/50 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">

          {/* Card Header */}
          <div className="bg-secondary rounded-t px-4 py-3">
            <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Welcome back</p>
            <h2 className="text-white font-bold text-sm uppercase tracking-wide">Sign In to CURA</h2>
          </div>

          <form onSubmit={handleLogin} className="p-4 space-y-2.5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs animate-[shake_0.4s_ease-in-out]">
                {error}
              </div>
            )}

            {/* Email Address */}
            <div className="p-2.5">
              <label htmlFor="email" className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-xs border-gray-300 focus:ring-secondary"
                placeholder="Enter your email"
                disabled={isTransitioning}
              />
            </div>

            {/* Password */}
            <div className="p-2.5">
              <label htmlFor="password" className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-xs border-gray-300 focus:ring-secondary"
                placeholder="Enter your password"
                disabled={isTransitioning}
              />
            </div>

            {/* Login Button */}
            <div className="pt-1">
              <Button
                type="submit"
                disabled={isLoggingIn || isTransitioning}
                className="w-full bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase tracking-wide shadow h-8 disabled:opacity-50"
              >
                {isLoggingIn ? "LOGGING IN..." : "LOGIN"}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer tagline */}
        <p className="text-center text-[10px] text-secondary font-medium uppercase tracking-wide mt-4 animate-[fadeIn_0.6s_ease-out_0.4s_both]">
          Centralized University Referral Application
        </p>

      </div>

      {/* UP Seal — lower left corner */}
      {!isTransitioning && (
        <div className="fixed bottom-4 left-4 z-20 flex items-center gap-2 animate-[fadeIn_0.6s_ease-out_0.4s_both]">
          <Image
            src="/upcd_logo.png"
            alt="UPCD Logo"
            width={60}
            height={60}
            className="object-contain"
          />
          <Image
            src="/up-seal.png"
            alt="University of the Philippines Seal"
            width={60}
            height={60}
            className="object-contain"
          />
          <p className="text-[9px] text-secondary/70 font-medium">© 2026 All Rights Reserved</p>
        </div>
      )}
    </div>
  );
}
