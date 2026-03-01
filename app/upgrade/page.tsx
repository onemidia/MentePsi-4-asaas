'use client';

import React from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, X, AlertTriangle, Brain, FileText, Shield, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';

export default function UpgradePage() {
  const { isTrialActive, isFreePlan, loading } = useSubscription();

  const trialExpired = !isTrialActive && isFreePlan;

  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-5xl space-y-8">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">Evolua sua prática clínica</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Desbloqueie todo o potencial do MentePsi 2.0.
          </p>
        </div>

        {trialExpired && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Seu período de teste expirou. Faça o upgrade para recuperar o acesso ilimitado.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-700">Plano Free</CardTitle>
              <CardDescription>Para iniciantes.</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold text-slate-900">R$ 0,00</span>
                <span className="text-slate-500">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> 3 Pacientes ativos</li>
                <Separator className="my-2" />
                <li className="flex items-center gap-2 text-slate-400"><X className="h-4 w-4" /> Sem IA</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Plano Atual</Button>
            </CardFooter>
          </Card>

          <Card className="border-teal-500 shadow-lg relative bg-white ring-2 ring-teal-500 ring-offset-2">
            <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">PROFISSIONAL</div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl text-teal-700">Professional</CardTitle>
                <Badge className="bg-teal-100 text-teal-700 border-0">Asaas</Badge>
              </div>
              <CardDescription>A suíte completa.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">R$ 59,90</span>
                <span className="text-slate-500">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-2 font-medium"><div className="bg-teal-100 p-1 rounded-full"><Check className="h-3 w-3 text-teal-600" /></div> Pacientes Ilimitados</li>
                <li className="flex items-center gap-2"><div className="bg-teal-100 p-1 rounded-full"><Brain className="h-3 w-3 text-teal-600" /></div> Assistente de IA</li>
                <li className="flex items-center gap-2"><div className="bg-teal-100 p-1 rounded-full"><FileText className="h-3 w-3 text-teal-600" /></div> Gerador de Laudos</li>
                <li className="flex items-center gap-2"><div className="bg-teal-100 p-1 rounded-full"><Shield className="h-3 w-3 text-teal-600" /></div> Segurança Asaas</li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-lg shadow-md" asChild>
                <Link href="/checkout">
                  Assinar Agora <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-xs text-center text-slate-400">Pagamento processado pelo Asaas.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}