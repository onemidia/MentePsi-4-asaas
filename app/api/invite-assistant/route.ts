import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(req: Request) {
  try {
    const { email, ownerId } = await req.json()

    const supabaseAdmin = createAdminClient()

    // cria convite no auth
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

    // verifica se já existe
    const { data: existing } = await supabaseAdmin
      .from("clinic_team")
      .select("id")
      .eq("member_email", email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "Este assistente já foi convidado." },
        { status: 400 }
      )
    }

    // adiciona à equipe
    const { error: insertError } = await supabaseAdmin
      .from("clinic_team")
      .insert({
        owner_id: ownerId,
        member_email: email,
        member_user_id: data.user.id,
        role: "assistant",
        active: true,
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
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}