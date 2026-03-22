'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  const startListening = useCallback(() => {
    // Impede iniciar múltiplas instâncias
    if (isListening) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Recurso Não Suportado',
        description: 'Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome.',
      })
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true // Traz resultados parciais em tempo real

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('') // Limpa a transcrição da sessão anterior
    }

    recognition.onresult = (event: any) => {
      let currentTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript
      }
      setTranscript(currentTranscript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      if (event.error === 'not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Microfone Bloqueado 🎤',
          description: 'Por favor, libere a permissão do microfone nas configurações do seu navegador para usar a digitação por voz.',
        })
      } else {
        console.error('Erro de reconhecimento de voz:', event.error)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening, toast])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  return { transcript, isListening, startListening, stopListening }
}