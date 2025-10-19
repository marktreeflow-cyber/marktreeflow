// /pages/social/calendar.js — v2025.10A
"use client";

import CalendarView from "@/components/CalendarView";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";

export default function SocialCalendarPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ArrowLeft
            size={20}
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={() => router.push("/social")}
          />
          Kalender Penjadwalan
        </h1>
      </div>

      <CalendarView />
    </div>
  );
}
