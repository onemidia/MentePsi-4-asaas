'use client'

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ArrowRight, LayoutDashboard, ShieldCheck, Calendar, Quote } from "lucide-react"

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
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200/50">
              <Link href="/planos">Começar Grátis</Link>
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
              <Link href="/planos">Criar Conta Gratuita <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-slate-300 text-slate-700 hover:bg-slate-50">
              <a href="#recursos">Ver Recursos</a>
            </Button>
          </div>
          
          {/* Dashboard Preview Mockup */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl border-4 border-slate-900/5 bg-slate-900/5 shadow-2xl lg:rotate-1 hover:rotate-0 transition-transform duration-700 ease-out">
             <div className="rounded-xl overflow-hidden bg-white border border-slate-200 aspect-video relative shadow-inner">
                {/* Fallback caso a imagem não exista ainda */}
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">
                   <LayoutDashboard size={48} className="opacity-20" />
                </div>
                <Image 
                  src="/foto-page.jpg" 
                  alt="Dashboard" 
                  fill
                  className="object-cover object-top"
                  priority
                />
             </div>
          </div>
        </div>
      </section>

      {/* Features */}
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
              description="Evoluções, anamneses e documentos com criptografia de ponta a ponta."
            />
            <FeatureCard 
              icon={<LayoutDashboard className="h-8 w-8 text-teal-600" />}
              title="Gestão Financeira"
              description="Controle pagamentos, emita recibos e visualize seu fluxo de caixa facilmente."
            />
          </div>
        </div>
      </section>

      {/* Pricing - Redireciona para a página oficial de planos */}
      <section id="precos" className="py-24 bg-slate-50 scroll-mt-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Planos que acompanham seu crescimento</h2>
          <p className="text-slate-500 mb-12">Teste todas as funcionalidades gratuitamente por 30 dias.</p>
          <Button size="lg" asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-14 px-12">
            <Link href="/planos">Ver Tabela de Preços e Recursos</Link>
          </Button>
        </div>
      </section>

      {/* Sobre (Dra. Aline) */}
      <section id="sobre" className="py-20 bg-white scroll-mt-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
            <div className="w-full lg:w-1/3 flex justify-center">
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-3xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-slate-100">
                  <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                  <Image 
                    src="/foto-aline-correa.jpg" 
                    alt="Dra. Aline Correa" 
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
                "Olá, eu sou a Aline Correa. Como psicóloga, sempre busquei uma forma de organizar meus prontuários e agenda sem perder a essência do acolhimento. O MentePsi nasceu dessa busca. Desenvolvi esta ferramenta para resolver as dores reais do meu dia a dia clínico."
              </p>

              <div className="flex items-center gap-4">
                <div className="h-12 w-1 flex bg-teal-600 rounded-full" />
                <div>
                    <p className="font-bold text-slate-900">Dra. Aline Correa</p>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">CRP: 06/12345</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-teal-600 rounded flex items-center justify-center text-white font-bold text-xs">M</div>
            <span className="font-semibold text-white tracking-tight">MentePsi</span>
          </div>
          <p className="text-sm">© 2026 MentePsi. Todos os direitos reservados. Feito para psicólogos.</p>
          <div className="flex gap-6 text-xs uppercase font-bold tracking-widest">
             <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
             <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white">
      <CardContent className="p-8 text-center flex flex-col items-center">
        <div className="mb-6 p-4 bg-teal-50 rounded-2xl text-teal-600">{icon}</div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}