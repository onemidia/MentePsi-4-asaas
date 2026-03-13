import { Loader2 } from "lucide-react"

export default function PlanosLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600 mx-auto" />
        <p className="text-sm font-medium text-slate-400 animate-pulse">Carregando ofertas...</p>
      </div>
    </div>
  )
}