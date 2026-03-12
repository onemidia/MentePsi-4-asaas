'use client'

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ArrowRight, LayoutDashboard, ShieldCheck, Calendar, Quote, Lock, Mail, MessageCircle } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans scroll-smooth">
      {/* Navbar */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">MentePsi</span>
          </div>
          
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <a href="#recursos" className="hover:text-teal-600 transition-colors">Recursos</a>
            <a href="#precos" className="hover:text-teal-600 transition-colors">Planos</a>
            <a href="#sobre" className="hover:text-teal-600 transition-colors">Sobre</a>
          </nav>

          <div className="flex gap-4">
            <Button variant="ghost" asChild className="text-slate-600 hover:text-teal-600">
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200/50">
              <Link href="/auth/registro">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-12 lg:pt-32 lg:pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 max-w-4xl mx-auto">
            Gestão Clínica Inteligente para <span className="text-teal-600">Psicólogos Modernos</span>
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Simplifique seus atendimentos, organize prontuários e automatize o financeiro. 
            Tudo o que você precisa para focar no que realmente importa: seus pacientes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="h-14 px-8 text-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-200">
              <Link href="/auth/registro">Criar Conta Gratuita <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-slate-300 text-slate-700 hover:bg-slate-50">
              <a href="#recursos">Ver Recursos</a>
            </Button>
          </div>
          
          <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl border-4 border-slate-900/5 bg-slate-900/5 shadow-2xl lg:rotate-1 hover:rotate-0 transition-transform duration-700 ease-out">
              <div className="rounded-xl overflow-hidden bg-white border border-slate-200 aspect-video relative shadow-inner">
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">
                   <LayoutDashboard size={48} className="opacity-20" />
                </div>
                <Image 
                  src="/foto-page.jpg" 
                  alt="Dashboard MentePsi" 
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-24 bg-white scroll-mt-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo em um só lugar</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Substitua planilhas e papéis por uma plataforma segura e intuitiva.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Calendar className="h-8 w-8 text-teal-600" />}
              title="Agenda Inteligente"
              description="Controle sessões, envie lembretes automáticos via WhatsApp e evite faltas."
            />
            <FeatureCard 
              icon={<ShieldCheck className="h-8 w-8 text-teal-600" />}
              title="Prontuário Seguro"
              description="Evoluções e documentos protegidos por criptografia de dados avançada."
            />
            <FeatureCard 
              icon={<LayoutDashboard className="h-8 w-8 text-teal-600" />}
              title="Gestão Financeira"
              description="Controle pagamentos, emita recibos e visualize seu lucro de forma automática."
            />
          </div>
        </div>
      </section>

{/* Preços - Ajustado para Plano Único */}
      <section id="precos" className="py-24 bg-slate-50 scroll-mt-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Plano Profissional Completo
          </h2>
          <p className="text-slate-500 mb-8 max-w-2xl mx-auto">
            Tudo o que você precisa para gerir sua clínica em uma única assinatura. 
            Sem letras miúdas, sem taxas escondidas.
          </p>
          
          <div className="mb-10 flex flex-col items-center">
            <div className="bg-teal-600/10 text-teal-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
              30 DIAS GRÁTIS PARA TESTAR
            </div>
            <p className="text-slate-400 text-sm italic">
              Acesso total a todos os recursos liberado imediatamente.
            </p>
          </div>

          <Button size="lg" asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-14 px-12 shadow-lg shadow-teal-200">
            <Link href="/planos">Conhecer o Plano e Recursos</Link>
          </Button>
        </div>
      </section>

      {/* Sobre (Aline Correa) */}
      <section id="sobre" className="py-20 bg-white scroll-mt-16 border-b border-slate-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
            <div className="w-full lg:w-1/3 flex justify-center">
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-3xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-slate-100">
                  <Image 
                    src="/foto-aline-correa.jpg" 
                    alt="Psicóloga Aline Correa" 
                    fill
                    className="object-cover"
                  />
              </div>
            </div>

            <div className="w-full lg:w-2/3 bg-teal-50/50 p-8 md:p-12 rounded-[2rem] border border-teal-100 relative">
              <Quote className="absolute top-6 right-8 h-12 w-12 text-teal-200/50" />
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-6">
                A tecnologia que humaniza meu consultório
              </h2>
              
              <p className="text-lg text-slate-600 font-serif leading-relaxed italic mb-8">
                "Olá, eu sou a Aline Correa. Como psicóloga, sempre busquei uma forma de organizar meus prontuários e agenda sem perder a essência do acolhimento. O MentePsi nasceu dessa busca por um cuidado mais humano e organizado. Uma solução pensada por quem vivencia a psicologia todos os dias."
              </p>

              <div className="flex items-center gap-4">
                <div className="h-12 w-1 flex bg-teal-600 rounded-full" />
                <div>
                    <p className="font-bold text-slate-900">Psicóloga Aline Correa</p>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">CRP: 06/98714</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Atualizado e Polido */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            {/* Coluna 1: Branding */}
            <div className="col-span-1 md:col-span-1 space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="h-7 w-7 bg-teal-600 rounded flex items-center justify-center text-white font-bold text-xs">M</div>
                <span className="font-bold text-white text-lg tracking-tight">MentePsi</span>
              </div>
              <p className="text-sm text-slate-400">
                O braço direito do psicólogo clínico. Organização e cuidado em cada detalhe.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-teal-400 border border-teal-900/50">
                  <Lock size={12} className="mr-1" /> AMBIENTE 100% SEGURO
                </span>
              </div>
            </div>

            {/* Coluna 2: Institucional */}
            <div className="text-center md:text-left space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">Institucional</h4>
              <nav className="flex flex-col space-y-2 text-sm">
                <Link href="/termos" className="hover:text-teal-400 transition-colors">Termos de Uso</Link>
                <Link href="/privacidade" className="hover:text-teal-400 transition-colors">Política de Privacidade</Link>
              </nav>
            </div>

            {/* Coluna 3: Contato Directo */}
            <div className="text-center md:text-left space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">Suporte</h4>
              <div className="flex flex-col space-y-3 text-sm">
                <a href="mailto:mentepsiclinic@gmail.com" className="flex items-center justify-center md:justify-start gap-2 hover:text-teal-400 transition-colors">
                  <Mail size={16} /> mentepsiclinic@gmail.com
                </a>
                <a 
                  href="https://wa.me/5516981518607" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center md:justify-start gap-2 hover:text-teal-400 transition-colors"
                >
                  <MessageCircle size={16} /> Falar no WhatsApp
                </a>
              </div>
            </div>

            {/* Coluna 4: Segurança LGPD */}
            <div className="text-center md:text-left space-y-4 bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
               <h4 className="text-white font-bold text-sm">Privacidade Total</h4>
               <p className="text-[11px] text-slate-500 leading-relaxed italic">
                 "Os prontuários e dados dos pacientes são criptografados e não podem ser acessados pela equipe MentePsi, garantindo o sigilo profissional."
               </p>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
            <p>© {new Date().getFullYear()} MentePsi. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <span>Feito por e para Psicólogos</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white overflow-hidden group">
      <div className="p-8 text-center flex flex-col items-center">
        <div className="mb-6 p-4 bg-teal-50 rounded-2xl text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
      </div>
    </Card>
  )
}