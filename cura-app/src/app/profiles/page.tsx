"use client";

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const sampleProfiles = [
  { id: "1", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "2", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "3", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "4", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "5", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "6", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "7", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "8", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
  { id: "9", firstName: "Doe,", lastName: "John", name: "DOE, JOHN", role: "ROLE", department: "DEPARTMENT", yearLevel: "YEAR LEVEL" },
];

export default function ProfilesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 p-4 sm:p-6 max-w-[1200px] mx-auto w-full">
        {/* Back to Home Link */}
        <Link href="/home" className="text-secondary text-sm mb-4 inline-block hover:underline">
          ← Back to Home
        </Link>

        {/* Search Header */}
        <div className="bg-secondary rounded-xl p-3 flex items-center justify-end gap-3 mb-6">
          <span className="text-white text-sm font-semibold">SEARCH</span>
          <div className="flex items-center bg-white rounded-lg overflow-hidden">
            <input
              type="text"
              placeholder="Search profiles..."
              className="px-4 py-2 text-sm outline-none w-[200px] sm:w-[280px]"
            />
            <button className="bg-secondary text-white p-2 hover:bg-secondary/90">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-xl p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Avatar with italic name */}
              <div className="flex-shrink-0 text-center">
                <div className="text-secondary italic text-sm leading-tight">
                  <div>{profile.firstName}</div>
                  <div>{profile.lastName}</div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h3 className="font-bold text-secondary text-base mb-1">{profile.name}</h3>
                <p className="text-xs text-gray-500">{profile.role} | {profile.department}</p>
                <p className="text-xs text-gray-500">{profile.yearLevel}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
