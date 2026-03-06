'use client'

import React, { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Sidebar } from "./sidebar" // Importa sua sidebar existente
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden flex items-center p-4 border-b bg-white w-full justify-between shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {/* Aqui você pode colocar sua Logo reduzida */}
        <span className="font-black text-teal-600 text-xl">MentePsi</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-slate-600">
            <Menu size={24} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px] border-none">
          <VisuallyHidden>
            <SheetTitle>Menu de Navegação</SheetTitle>
          </VisuallyHidden>
          {/* Reutiliza sua Sidebar original dentro do menu móvel */}
          <Sidebar className="w-full h-full border-none" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}