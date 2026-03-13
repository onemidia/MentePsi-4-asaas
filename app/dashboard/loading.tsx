import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><Skeleton className="h-96 lg:col-span-2 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
    </div>
  )
}