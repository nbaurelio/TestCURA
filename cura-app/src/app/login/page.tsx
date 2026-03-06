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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-gray-100">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(30, 90, 158, 0.1) 35px, rgba(30, 90, 158, 0.1) 70px)`,
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* CURA Logo */}
        <div className="flex justify-center mb-8">
          <Image 
            src="/cura-logo.png" 
            alt="CURA Logo" 
            width={300} 
            height={100}
            className="object-contain"
            priority
          />
        </div>

        {/* Login Form Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e5a9e] focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e5a9e] focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-[#1e5a9e] hover:bg-[#174a82] text-white font-semibold py-2.5 rounded-md transition-colors"
            >
              LOGIN
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
