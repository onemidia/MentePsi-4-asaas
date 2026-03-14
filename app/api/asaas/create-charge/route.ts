console.log(">>> TESTE DE CONEXÃO ASAAS V4 <<<");

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {

    const body = await req.json()

    const userId = body.userId
    const email = body.email
    const name = body.name
    const cpf = body.cpf
    const phone = body.phone

    if (!userId) {
      return NextResponse.json(
        { error: "userId obrigatório" },
        { status: 400 }
      )
    }

    // Buscar perfil
    const { data: profile, error: profileError } = await supabase
      .from("professional_profile")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (profileError) {
      console.error(profileError)
    }

    // Buscar plano
    const { data: plan, error: planError } = await supabase
      .from("saas_plans")
      .select("*")
      .eq("slug", "professional")
      .single()

    if (!plan) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      )
    }

    // 1. Limpeza de dados (Obrigatório para evitar Erro 400)
    const cleanCpf = cpf?.replace(/\D/g, "")
    const cleanPhone = phone?.replace(/\D/g, "")
    const asaasUrl = (
      process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3"
    )
      .trim()
      .replace(/['"]+/g, "")
    const asaasKey = (process.env.ASAAS_API_KEY || "")
      .trim()
      .replace(/['"]+/g, "")

    // 2. Garantir cliente Asaas (Corrigido para usar a URL dinâmica)
    let customerId = profile?.asaas_customer_id

    if (!customerId) {
      const customerResponse = await fetch(`${asaasUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasKey,
        },
        body: JSON.stringify({
          name,
          email,
          cpfCnpj: cleanCpf,
          mobilePhone: cleanPhone,
        }),
      })

      const customer = await customerResponse.json()

      if (!customerResponse.ok) {
        console.error(customer)
        throw new Error("Erro ao criar cliente no Asaas")
      }

      customerId = customer.id

      await supabase.from("professional_profile").update({
        asaas_customer_id: customerId,
      }).eq("user_id", userId)
    }

    // Data vencimento
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)

    // 1. Mude o endpoint de /payments para /subscriptions
    const paymentResponse = await fetch(`${asaasUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "CREDIT_CARD", // <--- MUDANÇA AQUI
        value: plan.price_monthly,
        nextDueDate: dueDate.toISOString().split("T")[0],
        cycle: "MONTHLY", // <--- ISSO GERA A RECORRÊNCIA MENSAL
        description: `Assinatura Plano ${plan.name} - MentePsi`,
        externalReference: userId,
        // Garantindo que todas as URLs de retorno apontem para o domínio oficial em produção
        returnUrl: "https://www.mentepsi.com.br/success",
        callback: {
          successUrl: "https://www.mentepsi.com.br/success",
          autoRedirect: true
        }
      }),
    })

    const subscription = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error(subscription)
      throw new Error("Erro ao criar assinatura")
    }

    // 🔥 BUSCAR A FATURA DA ASSINATURA PARA O REDIRECIONAMENTO
    // Vamos listar as cobranças dessa assinatura que acabamos de criar
    const paymentsRes = await fetch(`${asaasUrl}/subscriptions/${subscription.id}/payments`, {
      headers: { access_token: asaasKey }
    })
    const paymentsData = await paymentsRes.json()

    // Pegamos a URL da primeira fatura disponível
    const firstInvoiceUrl = paymentsData.data?.[0]?.invoiceUrl || subscription.invoiceUrl

    return NextResponse.json({
      invoiceUrl: firstInvoiceUrl, // Agora o frontend terá para onde ir!
      subscriptionId: subscription.id
    })

  } catch (error: any) {

    console.error("Erro create-charge:", error)

    return NextResponse.json(
      { error: error.message || "Erro ao criar cobrança" },
      { status: 500 }
    )
  }
}