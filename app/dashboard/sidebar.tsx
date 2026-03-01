'use client'

import { useEffect, useState } from 'react'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  LogOut, 
  FileText, 
  ShieldCheck, 
  Activity,
  User,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from '@/lib/client'

const professionalItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Agenda", href: "/agenda" },
  { icon: Users, label: "Pacientes", href: "/pacientes" },
  { icon: FileText, label: "Documentos", href: "/documentos" },
  { icon: CreditCard, label: "Financeiro", href: "/financeiro" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
]

const adminItems = [
  { icon: LayoutDashboard, label: "Dashboard Master", href: "/admin" },
  { icon: Users, label: "Gestão de Psicólogos", href: "/admin/users" },
  { icon: Activity, label: "Assinaturas", href: "/admin/assinaturas" },
  { icon: ShieldCheck, label: "Configurações", href: "/admin/configuracoes" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [plan, setPlan] = useState<string>("")

  useEffect(() => {
    const fetchUserData = async () => {
      // Pega o usuário da sessão ativa
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserEmail(user.email || "")
        
        // BUSCA SEGURA: Filtra os dados do perfil estritamente pelo ID do usuário logado
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, selected_plan')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserName(profile.full_name || "Profissional")
          setPlan(profile.selected_plan || "Iniciante")
        } else {
          setUserName(user.user_metadata?.full_name || "Profissional")
          setPlan("Iniciante")
        }
        
        // Verifica permissões de Admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', user.id)
          .single()
          
        setRole(roleData?.role || 'professional')
      }
    }
    fetchUserData()
  }, [])

  // Não exibir a sidebar no Login ou Portal do Paciente
  if (pathname === '/' || pathname === '/login' || pathname?.startsWith('/portal')) {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh() // Limpa o cache do Next.js
  }

  // Define itens baseando-se na rota e permissão
  const isAdminRoute = pathname?.startsWith('/admin')
  const items = (isAdminRoute && role === 'admin') ? adminItems : professionalItems

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white fixed left-0 top-0 z-10 hidden md:flex">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold text-teal-600 flex items-center gap-2 tracking-tight">
          MentePsi 
          {role === 'admin' ? (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">ADMIN</span>
          ) : (
            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">v4</span>
          )}
        </h1>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t p-4 space-y-4 bg-slate-50/50">
        {/* Perfil do Usuário com Plano */}
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-10 w-10 border border-white shadow-sm">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
            <AvatarFallback className="bg-teal-100 text-teal-700 font-bold">{userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
            <p className="text-[10px] font-medium text-teal-600">Plano {plan}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="px-2 text-[10px] text-slate-400 truncate">{userEmail}</p>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 h-9 transition-colors" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </Button>
        </div>
      </div>
    </div>
  )
}