'use client'

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
  Settings,
  DollarSign,
  Settings2,
  HeadphonesIcon,
  UserCog
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

const assistantItems = [
  { icon: LayoutDashboard, label: "Meu Painel", href: "/dashboard/assistente" },
  { icon: Calendar, label: "Agenda", href: "/agenda" },
  { icon: Users, label: "Pacientes", href: "/pacientes" },
  { icon: FileText, label: "Documentos", href: "/documentos" },
  { icon: DollarSign, label: "Financeiro", href: "/financeiro" },
]

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [plan, setPlan] = useState<string>("")
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>("") // Estado para o Zap
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [currentView, setCurrentView] = useState<string>('professional')
  const supabase = createClient()

  // 1. Verifique se existe um ID de impersonate (Atualiza ao mudar de rota)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsImpersonating(!!localStorage.getItem('impersonate_id'))
    }
  }, [pathname])

  useEffect(() => {
    const storedView = localStorage.getItem('currentView')
    if (storedView) {
      setCurrentView(storedView)
    } else {
      if (pathname?.startsWith('/admin')) setCurrentView('admin')
      else if (pathname?.startsWith('/dashboard/assistente')) setCurrentView('assistant')
      else setCurrentView('professional')
    }
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      const impersonateId = localStorage.getItem('impersonate_id');
      
      // ⚡ CACHE DE SESSÃO: Recupera dados se não estiver em modo espião
      const cached = sessionStorage.getItem('sidebar_cache')
      if (cached && !impersonateId) {
        const data = JSON.parse(cached)
        setRole(data.role)
        setUserName(data.userName)
        setPlan(data.plan)
        setUserEmail(data.userEmail)
        setSupportWhatsapp(data.supportWhatsapp)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // 🟢 O PULO DO GATO: Se estiver impersonando, usa o ID da Paola para buscar o nome/role
        const targetId = impersonateId || user.id;
        
        setUserEmail(user.email || "")
        
        // 1. Prioridade: Verifica se é Admin (Super Admin ou Role Admin)
        const admins = ['alvino@onemidia.tv.br', 'mentepsiclinic@gmail.com', 'onemidiamarketing@gmail.com'];
        const isSuperAdmin = admins.includes(user.email || '');

        const { data: prof } = await supabase
          .from('professional_profile')
          .select('full_name, role')
          .eq('user_id', targetId) // Busca o dono do ID alvo
          .maybeSingle()

        let finalRole = null
        let finalName = ""
        let finalPlan = ""

        if (isSuperAdmin || prof?.role === 'admin') {
          finalRole = 'admin'
          finalName = prof?.full_name || "Administrador"
          finalPlan = "Master"
          setRole(finalRole)
          setUserName(finalName)
          setPlan(finalPlan)
        } 
        // 2. Prioridade: Verifica se é Assistente (Se não estiver impersonando)
        else if (!impersonateId) {
          const { data: assistant } = await supabase
            .from('clinic_team')
            .select('name')
            .eq('email', user.email)
            .eq('status', 'active')
            .maybeSingle()

          if (assistant) {
            setRole('assistant')
            setPlan('Equipe')
            setUserName(assistant.name || "Assistente")
            // Retorna aqui para não cair na lógica de profissional
            return 
          }
        }

        // 3. Prioridade: Profissional (Padrão)
        if (prof && !role) { // Só entra se role ainda não foi definido
          setUserName(prof.full_name || "Profissional")
          setRole(impersonateId ? 'professional' : prof.role)
          
          const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', targetId).order('created_at', { ascending: false }).limit(1).maybeSingle()
          setPlan(sub?.status === 'trialing' ? "Trial Profissional" : "Profissional")
        }

        const { data: settings, error } = await supabase.from('global_settings').select('whatsapp').eq('id', 1).single()
        
        if (settings?.whatsapp) {
          setSupportWhatsapp(settings.whatsapp)
        } else if (error) {
          console.error("Erro ao carregar suporte:", error.message);
        }
      }
    }
    fetchUserData()
  }, [supabase, pathname]) // Adicionei pathname aqui para ele re-checar ao mudar de página

  // 🟢 Só some se for rota de paciente (/portal/ID), mas APARECE no seu gerenciador (/portal)
  if (pathname === '/' || pathname === '/login' || pathname === '/hub' || (pathname?.startsWith('/portal/') && pathname !== '/portal')) {
    return null
  }

  const handleLogout = async () => {
    localStorage.removeItem('currentView')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleAdminReturn = () => {
    localStorage.removeItem('impersonate_id')
    window.location.href = '/admin'
  }

  const handleSwitchMode = (view: string, path: string) => {
    localStorage.setItem('currentView', view)
    setCurrentView(view)
    router.push(path)
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

  // A Inteligência da Sidebar (Troca de Menu por Rota)
  let items = professionalItems;
  if (currentView === 'admin') {
    items = adminItems;
  } else if (currentView === 'assistant' || role === 'assistant') {
    items = assistantItems;
  }

  return (
    <div className={cn("flex h-full w-full flex-col border-r bg-white", className)}>
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold text-teal-600 flex items-center gap-2 tracking-tight">
          MentePsi 
          {role === 'admin' ? (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-bold uppercase">Master</span>
          ) : role === 'assistant' ? (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-bold uppercase">Equipe</span>
          ) : (
            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100 font-bold uppercase">App</span>
          )}
        </h1>
      </div>
      
      {/* SELETOR DE AMBIENTE (EXCLUSIVO ADMIN) */}
      {['alvino@onemidia.tv.br', 'mentepsiclinic@gmail.com', 'onemidiamarketing@gmail.com'].includes(userEmail) && (
        <div className="px-4 py-4 mb-4 border-b border-slate-200 bg-slate-50/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Alternar Ambiente</p>
          <div className="flex justify-between gap-2 mb-3">
            <button 
              onClick={() => handleSwitchMode('admin', '/admin')}
              className={cn("p-2 rounded-lg transition-colors flex-1 flex justify-center", currentView === 'admin' ? 'bg-teal-100 text-teal-600 shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200')}
              title="Painel Gestor"
            >
              <ShieldCheck size={18} />
            </button>
            
            <button 
              onClick={() => handleSwitchMode('professional', '/dashboard')}
              className={cn("p-2 rounded-lg transition-colors flex-1 flex justify-center", currentView === 'professional' ? 'bg-emerald-100 text-emerald-600 shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200')}
              title="Modo Profissional"
            >
              <LayoutDashboard size={18} />
            </button>

            <button 
              onClick={() => handleSwitchMode('assistant', '/dashboard/assistente')}
              className={cn("p-2 rounded-lg transition-colors flex-1 flex justify-center", currentView === 'assistant' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'bg-white border border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200')}
              title="Modo Assistente"
            >
              <UserCog size={18} />
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/hub')} className="w-full h-7 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-200 uppercase tracking-wider rounded-lg">Voltar ao Hub</Button>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {items.map((item) => {
          const isActive = (item.href === '/admin' || item.href === '/dashboard/assistente') ? pathname === item.href : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
        {!pathname?.startsWith('/admin') && !pathname?.startsWith('/dashboard/assistente') && (
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
          
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 h-9 transition-colors text-xs" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </Button>
        </div>
      </div>
    </div>
  )
}