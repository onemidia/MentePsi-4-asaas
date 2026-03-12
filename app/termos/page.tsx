'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Botão Voltar */}
        <Link 
          href="/" 
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-8 transition-colors font-medium"
        >
          <ArrowLeft size={20} className="mr-2" />
          Voltar para o início
        </Link>
        
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-teal-600 h-8 w-8" />
            <h1 className="text-3xl font-bold text-slate-900">Termos de Uso</h1>
          </div>
          
          <p className="text-slate-500 mb-8 pb-6 border-b border-slate-100">
            Última atualização: 12 de Março de 2026
          </p>
          
          <div className="space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar a plataforma <strong>MentePsi</strong>, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
                Esta ferramenta é destinada exclusivamente a profissionais da área da saúde mental devidamente registrados em seus respectivos conselhos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Responsabilidade Profissional</h2>
              <p>
                O MentePsi é um software de suporte à gestão clínica e organização de prontuários. 
                A conduta técnica, diagnósticos, tratamentos e o conteúdo das anotações clínicas são de responsabilidade exclusiva do profissional usuário. 
                O sigilo das credenciais de acesso é individual e intransferível.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Assinatura e Cancelamento</h2>
              <p>
                O acesso às funcionalidades profissionais ocorre mediante assinatura mensal ou anual processada pelo provedor <strong>Asaas</strong>. 
                O cancelamento pode ser realizado a qualquer momento pelo painel de configurações, garantindo o acesso até o fim do período vigente já pago.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Disponibilidade do Serviço</h2>
              <p>
                Trabalhamos para manter a plataforma disponível 24/7, porém, não nos responsabilizamos por interrupções causadas por falhas na conexão de internet do usuário ou manutenções técnicas programadas.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Dúvidas sobre os termos? Entre em contato com nosso suporte através do e-mail oficial disponível na Landing Page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}