'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Search, PlayCircle, BookOpen, Video, ExternalLink } from "lucide-react"

export default function TutoriaisPage() {
  const [tutorials, setTutorials] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [categories, setCategories] = useState<string[]>(['Todos'])
  const supabase = createClient()

  useEffect(() => {
    const fetchTutorials = async () => {
      const { data } = await supabase.from('tutorials').select('*').eq('active', true).order('created_at', { ascending: false })
      if (data) {
        setTutorials(data)
        // Extrai categorias únicas
        const cats = Array.from(new Set(data.map(t => t.category))).filter(Boolean) as string[]
        setCategories(['Todos', ...cats])
      }
    }
    fetchTutorials()
  }, [])

  const filteredTutorials = tutorials.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todos' || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Video className="text-teal-600" /> Central de Tutoriais
          </h1>
          <p className="text-slate-500 font-medium">Aprenda a usar todas as ferramentas do MentePsi.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar tutorial..." 
            className="pl-9 bg-white border-slate-200 rounded-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Button 
            key={cat} 
            variant={selectedCategory === cat ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full h-8 text-xs ${selectedCategory === cat ? 'bg-teal-600 hover:bg-teal-700' : 'border-slate-200 text-slate-600'}`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Grid de Vídeos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTutorials.map(t => (
          <Dialog key={t.id}>
            <DialogTrigger asChild>
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden">
                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                  {t.video_url && (
                    <img 
                      src={`https://img.youtube.com/vi/${t.video_url.split('v=')[1]?.split('&')[0]}/hqdefault.jpg`} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="text-white w-12 h-12 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-lg" />
                  </div>
                  <Badge className="absolute top-3 right-3 bg-teal-600 hover:bg-teal-700 border-none">{t.category}</Badge>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-base text-slate-800 group-hover:text-teal-600 transition-colors line-clamp-1">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{t.description}</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
              <div className="aspect-video w-full">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${t.video_url.split('v=')[1]?.split('&')[0]}?autoplay=1`} 
                  title={t.title} 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="border-none"
                />
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>

      {filteredTutorials.length === 0 && (
        <div className="text-center py-20 text-slate-400">Nenhum tutorial encontrado.</div>
      )}
    </div>
  )
}
