"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // For now, just navigate to home page
    // In production, this would authenticate with backend
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/oble.png)" }}
      />

      {/* White overlay */}
      <div className="fixed inset-0 z-0 bg-white/50" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[300px] mx-auto px-2">

        {/* CURA Logo */}
        <div className="flex justify-center mb-5">
          <Image
            src="/CURA_Full.png"
            alt="CURA Logo"
            width={200}
            height={68}
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        {/* Login Card — matches homepage card style */}
        <div className="bg-white/60 backdrop-blur-sm rounded shadow border-2 border-gray-300">

          {/* Card Header — matches modal/sidebar headers */}
          <div className="bg-secondary rounded-t px-4 py-3">
            <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Welcome back</p>
            <h2 className="text-white font-bold text-sm uppercase tracking-wide">Sign In to CURA</h2>
          </div>

          <form onSubmit={handleLogin} className="p-4 space-y-2.5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            {/* Email Address */}
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
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
              />
            </div>

            {/* Password */}
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <label htmlFor="password" className="text-[10px] font-bold text-secondary uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-xs border-gray-300 focus:ring-secondary"
                placeholder="Enter your password"
              />
            </div>

            {/* Login Button */}
            <div className="pt-1">
              <Button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90 text-white text-[10px] font-bold uppercase tracking-wide shadow h-8"
              >
                LOGIN
              </Button>
            </div>
          </form>
        </div>

        {/* Footer tagline */}
        <p className="text-center text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-4">
          Centralized University Referral Application
        </p>

      </div>
    </div>
  );
}
