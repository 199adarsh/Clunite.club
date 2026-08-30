"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function EventAnalyticsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/organizer/host/analytics")
  }, [router])

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Redirecting to Live Analytics...</p>
      </div>
    </div>
  )
}
