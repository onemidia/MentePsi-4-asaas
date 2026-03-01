'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  LogOut, 
  FileText, 
  ShieldCheck, 
  Activity,
  Settings,
  Layout,
  DollarSign,
  Settings2,
  HeadphonesIcon // Adicionado para o Suporte
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from '@/lib/client'
import { useEffect, useState } from 'react'

const professionalItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Agenda", href: "/agenda" },
  { icon: Users, label: "Pacientes", href: "/pacientes" },
  { icon: LayoutDashboard, label: "Portal dos Pacientes", href: "/portal" },
  { icon: FileText, label: "Documentos", href: "/documentos" },
  { icon: CreditCard, label: "Financeiro", href: "/financeiro" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
]

const adminItems = [
  { icon: LayoutDashboard, label: "Dashboard Master", href: "/admin" },
  { icon: ShieldCheck, label: "Gestão de Acessos", href: "/admin/users" },
  { icon: DollarSign, label: "Financeiro Global", href: "/admin/financeiro" },
  { icon: Settings2, label: "Configuração de Planos", href: "/admin/planos" },
  { icon: ShieldCheck, label: "Configurações do SaaS", href: "/admin/configuracoes" },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [plan, setPlan] = useState<string>("")
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>("") // Estado para o Zap
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || "")
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, plan_type, subscription_status')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserName(profile.full_name || "Profissional")
          setRole(profile.role || 'user')
          
          const isTrial = profile.subscription_status === 'trialing'
          setPlan(isTrial ? "Profissional" : (profile.plan_type || "Iniciante"))
        }

        // BUSCA O WHATSAPP - Adicionamos um console.log para debugar
        const { data: settings, error } = await supabase
          .from('global_settings')
          .select('whatsapp')
          .eq('id', 1) // Garante que pega a linha 1
          .single()
        
        if (settings?.whatsapp) {
          setSupportWhatsapp(settings.whatsapp)
        } else if (error) {
          console.error("Erro ao carregar suporte:", error.message);
        }
      }
    }
    fetchUserData()
  }, [supabase])

  if (pathname === '/' || pathname === '/login' || pathname?.startsWith('/portal/')) {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleAdminReturn = () => {
    localStorage.removeItem('impersonate_id')
    window.location.href = '/admin'
  }

  // 2. Atualize a função de clique para ser "instantânea"
  const handleSupportClick = async () => {
    let numberToUse = supportWhatsapp;

    // Se por algum motivo o estado estiver vazio, tentamos buscar direto no banco agora
    if (!numberToUse) {
      const { data } = await supabase.from('global_settings').select('whatsapp').eq('id', 1).single();
      if (data?.whatsapp) {
        numberToUse = data.whatsapp;
      }
    }

    if (numberToUse) {
      const cleanNumber = numberToUse.replace(/\D/g, '');
      const message = encodeURIComponent(`Olá Suporte MentePsi! Preciso de ajuda com minha conta (${userName}).`);
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    } else {
      alert("Número de suporte não encontrado. Por favor, tente novamente em instantes.");
    }
  }

  const isAdminRoute = pathname?.startsWith('/admin')
  const items = (isAdminRoute && role === 'admin') ? adminItems : professionalItems

  return (
    <div className={cn("flex h-full w-full flex-col border-r bg-white", className)}>
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold text-teal-600 flex items-center gap-2 tracking-tight">
          MentePsi 
          {role === 'admin' ? (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-bold uppercase">Master</span>
          ) : (
            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100 font-bold uppercase">App</span>
          )}
        </h1>
      </div>
      
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {items.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-teal-600" : "text-slate-400")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t p-4 space-y-4 bg-slate-50/30">
        
        {/* BOTÃO DE SUPORTE - Visível apenas para Profissionais */}
        {role !== 'admin' && (
          <Button 
            variant="outline" 
            onClick={handleSupportClick}
            className="w-full justify-start gap-3 text-teal-700 border-teal-200 bg-white hover:bg-teal-50 h-10 shadow-sm font-bold transition-all"
          >
            <HeadphonesIcon className="h-4 w-4 text-teal-500" />
            Ajuda & Suporte
          </Button>
        )}

        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
            <AvatarFallback className="bg-teal-100 text-teal-700">{userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 truncate leading-tight">{userName}</p>
            <p className="text-[10px] text-teal-600 font-bold uppercase tracking-tighter">Plano {plan}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="px-2 text-[10px] text-slate-400 truncate mb-1">{userEmail}</p>
          
          {role === 'admin' && !isAdminRoute && (
            <Button variant="outline" className="w-full justify-start gap-3 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 h-9 mb-2 shadow-sm font-bold" onClick={handleAdminReturn}>
              <Layout className="h-4 w-4" /> Voltar ao Master
            </Button>
          )}

          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 h-9 transition-colors text-xs" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </Button>
        </div>
      </div>
    </div>
  )
}