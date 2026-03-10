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
      <div className="absolute inset-0">
        <Image
          src="/login-bg.jpg"
          alt="Login Background"
          fill
          className="object-cover"
          priority
        />
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-[#98C8FB]/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* CURA Logo */}
        <div className="flex justify-center mb-8">
          <Image 
            src="/cura-logo.png" 
            alt="CURA Logo" 
            width={280} 
            height={95}
            className="object-contain drop-shadow-lg"
            priority
          />
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-5">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e5a9e] focus:border-transparent transition-all"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e5a9e] focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-[#1e5a9e] hover:bg-[#174a82] text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg mt-6"
            >
              LOGIN
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
