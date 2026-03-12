'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'

export default function PoliticaPrivacidade() {
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
            <Lock className="text-teal-600 h-8 w-8" />
            <h1 className="text-3xl font-bold text-slate-900">Política de Privacidade</h1>
          </div>
          
          <p className="text-slate-500 mb-8 pb-6 border-b border-slate-100">
            Última atualização: 12 de Março de 2026
          </p>
          
          <div className="space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Compromisso com a LGPD</h2>
              <p>
                O <strong>MentePsi</strong> foi desenvolvido seguindo as diretrizes da Lei Geral de Proteção de Dados (Lei nº 13.709/2018). 
                Garantimos que os dados sensíveis de seus pacientes sejam tratados com o mais alto nível de sigilo e segurança digital.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Coleta de Dados do Profissional</h2>
              <p>
                Coletamos apenas informações essenciais para a prestação do serviço: nome completo, CPF (para emissão de faturas via Asaas), e-mail e telefone de contato. 
                Estes dados são utilizados exclusivamente para gestão da sua conta e comunicações do sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Armazenamento e Criptografia</h2>
              <p>
                Os prontuários e dados de pacientes são armazenados em bancos de dados protegidos e criptografados. 
                Nós não acessamos, vendemos ou compartilhamos o conteúdo clínico inserido na plataforma. O conteúdo pertence única e exclusivamente ao profissional titular da conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Exclusão de Dados</h2>
              <p>
                O profissional tem o direito de solicitar a exclusão total de seus dados e dos dados de seus pacientes a qualquer momento. 
                Uma vez solicitada e confirmada a exclusão, os dados são removidos permanentemente de nossos servidores ativos.
              </p>
            </section>

            <section className="pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Para questões relacionadas à privacidade de dados, entre em contato diretamente pelo nosso canal de suporte.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}