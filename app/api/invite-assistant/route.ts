import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(req: Request) {
  try {

    const { email, ownerId } = await req.json()

    if (!email || !ownerId) {
      return NextResponse.json(
        { error: "Email ou ownerId ausente" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 1️⃣ Evitar duplicidade de assistente na mesma clínica
    const { data: existing } = await supabaseAdmin
      .from("clinic_team")
      .select("id")
      .eq("member_email", email)
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "Este assistente já foi convidado para esta clínica." },
        { status: 400 }
      )
    }

    let userId: string

    // 2️⃣ Verificar se o usuário já existe no Supabase Auth
    // Usamos schema('auth') para consultar diretamente sem enviar e-mail desnecessário
    const { data: existingAuthUser } = await supabaseAdmin
      .schema("auth")
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingAuthUser) {
      // Usuário já existe, aproveitamos o ID
      userId = existingAuthUser.id
      
      // ✨ Envia um "magic link" para notificar o usuário existente e permitir o login direto
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/`
        }
      })
    } else {
      // Usuário não existe, enviamos o convite
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`
        }
      )

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (!data.user) {
        return NextResponse.json(
          { error: "Usuário não foi criado no auth" },
          { status: 400 }
        )
      }

      userId = data.user.id
    }

    // 3️⃣ Melhorar o registro na tabela clinic_team
    const { error: insertError } = await supabaseAdmin
      .from("clinic_team")
      .insert({
        owner_id: ownerId,
        member_email: email,
        member_user_id: userId,
        role: "assistant",
        active: false, // Inativo até aceitar
        status: "pending", // Pendente
        can_manage_calendar: true,
        can_edit_appointments: true
      })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
