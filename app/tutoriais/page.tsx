'use client'

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import Image from 'next/image'
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  MonitorSmartphone, 
  FileText, 
  DollarSign, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle,
  Sparkles
} from "lucide-react"

const helpModules = [
  {
    id: 'acesso',
    title: 'Acesso Seguro',
    icon: ShieldCheck,
    slides: [
      {
        image: '/assets/ajuda/passo1-login1-entrar.jpg.webp',
        title: 'Seu Espaço de Volta',
        description: 'O MentePsi lembra de você. Acesse sua conta para continuar cuidando dos seus pacientes.',
        instruction: 'Digite seu e-mail e senha e clique em Entrar.'
      },
      {
        image: '/assets/ajuda/passo1-login2-criar uma conta.jpg.webp',
        title: 'Iniciando sua Jornada',
        description: 'Estamos felizes em ter você aqui! Comece agora a transformar sua gestão.',
        instruction: 'Preencha seus dados básicos e crie uma senha segura.'
      },
      {
        image: '/assets/ajuda/passo1-login3-criar uma conta google.jpg.webp',
        title: 'Facilidade com Google',
        description: 'Menos uma senha para decorar. Use sua conta Google para acesso rápido.',
        instruction: 'Clique em Registrar com Google para integração total.'
      },
      {
        image: '/assets/ajuda/passo1-login-recuperação de senha.jpg.webp',
        title: 'Cuidado com sua Senha',
        description: 'Esqueceu o acesso? Não se preocupe, recuperar sua conta é simples e seguro.',
        instruction: 'Informe seu e-mail para receber o link de redefinição.'
      }
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    slides: [
      {
        image: '/assets/ajuda/passo2-dashboard.jpg.webp',
        title: 'Seu Painel de Controle',
        description: 'Uma visão clara para uma mente tranquila. Acompanhe faturamento e sessões do dia.',
        instruction: 'O dashboard resume tudo o que você precisa saber ao abrir o sistema.'
      }
    ]
  },
  {
    id: 'pacientes',
    title: 'Pacientes',
    icon: Users,
    slides: [
      {
        image: '/assets/ajuda/passo3-1-novo paciente.jpg.webp',
        title: 'Sua Comunidade de Cuidado',
        description: 'Visualize todos os rostos e histórias que confiam no seu trabalho.',
        instruction: 'Use o botão "Ficha" para entrar no prontuário do paciente.'
      },
      {
        image: '/assets/ajuda/passo3-2-novo paciente.jpg.webp',
        title: 'Boas-vindas ao Novo Paciente',
        description: 'Cadastre seus pacientes com agilidade e segurança de dados.',
        instruction: 'Clique em + Novo Paciente e preencha o formulário.'
      },
      {
        image: '/assets/ajuda/passo3-3-novo paciente.jpg.webp',
        title: 'Organização da Base',
        description: 'Filtre e busque pacientes rapidamente por nome ou CPF.',
        instruction: 'Mantenha o status (Ativo/Inativo) sempre atualizado.'
      }
    ]
  },
  {
    id: 'agenda',
    title: 'Agenda',
    icon: Calendar,
    slides: [
      {
        image: '/assets/ajuda/passo4-1-agendamento.jpg.webp',
        title: 'Sua Semana em um Olhar',
        description: 'Visualize seus dias com clareza. Uma agenda organizada é o primeiro passo para uma prática clínica equilibrada.',
        instruction: 'Clique no menu Agenda. Você pode alternar entre as visões de Dia, Semana ou Mês.'
      },
      {
        image: '/assets/ajuda/passo4-2-agendamento.jpg.webp',
        title: 'Agendando um Novo Cuidado',
        description: 'Criar um novo compromisso é simples. O sistema organiza os detalhes para você focar apenas no atendimento.',
        instruction: 'Clique no botão + Novo Agendamento ou diretamente no horário desejado.'
      },
      {
        image: '/assets/ajuda/passo4-3-agendamento.jpg.webp',
        title: 'Atendimentos Recorrentes',
        description: 'Previsibilidade para você, constância para seu paciente. Configure sessões semanais, quinzenais ou mensais com um clique.',
        instruction: 'Ative a chave de recorrência e escolha a frequência (Semanal/Quinzenal/Mensal).'
      },
      {
        image: '/assets/ajuda/passo4-4-agendamento.jpg.webp',
        title: 'Flexibilidade de Ajustes',
        description: 'Imprevistos acontecem. No MentePsi, você ajusta ou remove sessões de forma prática, mantendo tudo atualizado.',
        instruction: 'Clique sobre um agendamento para abrir as opções de Reagendar ou Excluir.'
      }
    ]
  },
  {
    id: 'prontuario',
    title: 'Ficha Clínica',
    icon: ClipboardList,
    slides: [
      {
        image: '/assets/ajuda/passo5-1-ficha do pacinete.jpg.webp',
        title: 'Prontuário Digital',
        description: 'Toda a jornada do seu paciente centralizada. Aqui você tem uma visão 360º do tratamento, garantindo segurança e sigilo.',
        instruction: 'Na lista de pacientes, clique no botão verde "Ficha" para abrir este painel.'
      },
      {
        image: '/assets/ajuda/passo5-2-ficha do pacinete-aba perfil1.jpg.webp',
        title: 'Perfil do Paciente',
        description: 'Dados demográficos e informações essenciais sempre à mão para facilitar o contato e a personalização do atendimento.',
        instruction: 'A aba Perfil é a primeira que você vê ao abrir a ficha.'
      },
      {
        image: '/assets/ajuda/passo5-3-ficha do pacinete-aba perfil2.jpg.webp',
        title: 'Personalização Avançada',
        description: 'Adicione detalhes específicos que ajudam a entender o contexto social e familiar do seu paciente.',
        instruction: 'Role a página para baixo na aba Perfil para ver campos adicionais.'
      },
      {
        image: '/assets/ajuda/passo5-3-ficha do pacinete-aba sessoes1.jpg.webp',
        title: 'Histórico de Evoluções',
        description: 'Acompanhe a linha do tempo de todas as sessões realizadas. Documentar o progresso nunca foi tão organizado.',
        instruction: 'Acesse a aba "Sessões" para ver a lista de todos os atendimentos passados.'
      },
      {
        image: '/assets/ajuda/passo5-4-ficha do pacinete-aba financeiro1.jpg.webp',
        title: 'Financeiro Individual',
        description: 'Gestão transparente de pagamentos por paciente. Saiba exatamente o que foi pago e o que está pendente.',
        instruction: 'A aba Financeiro dentro da ficha mostra o extrato exclusivo deste paciente.'
      },
      {
        image: '/assets/ajuda/passo5-5-ficha do pacinete-aba financeiro1.jpg.webp',
        title: 'Controle de Saldos',
        description: 'Visualize de forma rápida o saldo de sessões e valores em aberto para evitar mal-entendidos.',
        instruction: 'Use os filtros de data para localizar pagamentos específicos.'
      },
      {
        image: '/assets/ajuda/passo5-5-ficha do pacinete-aba financeiro2.jpg.webp',
        title: 'Registro de Pagamentos',
        description: 'Dê baixa em sessões e registre novos pagamentos diretamente no prontuário do paciente.',
        instruction: 'Clique em "Baixar" na sessão correspondente para atualizar o financeiro.'
      },
      {
        image: '/assets/ajuda/passo5-6-ficha do pacinete-aba portal1.jpg.webp',
        title: 'Gestão do Portal',
        description: 'Controle o que o seu paciente pode ver ou fazer no portal exclusivo dele.',
        instruction: 'Ative ou desative módulos como "Metas" ou "Diário de Emoções".'
      },
      {
        image: '/assets/ajuda/passo5-6-ficha do pacinete-aba portal2.jpg.webp',
        title: 'Convite para o Portal',
        description: 'Gere o acesso do seu paciente para que ele participe ativamente do processo terapêutico.',
        instruction: 'Clique em "Gerar Acesso" para enviar as credenciais ao paciente.'
      },
      {
        image: '/assets/ajuda/passo5-7-ficha do pacinete-aba emocoesl1.jpg.webp',
        title: 'Termômetro Emocional',
        description: 'Acompanhe como o paciente se sente entre as sessões. Uma ferramenta poderosa para identificar gatilhos.',
        instruction: 'Acesse a aba "Emoções" para ver o histórico de registros do paciente.'
      },
      {
        image: '/assets/ajuda/passo5-7-ficha do pacinete-aba emocoesl2.jpg.webp',
        title: 'Gráfico de Sentimentos',
        description: 'Visualize padrões e oscilações de humor através de gráficos intuitivos baseados nos registros dele.',
        instruction: 'Analise a evolução emocional ao longo das últimas semanas ou meses.'
      },
      {
        image: '/assets/ajuda/passo5-8-ficha do pacinete-aba metas1.jpg.webp',
        title: 'Plano Terapêutico',
        description: 'Defina metas claras. Ter objetivos visíveis aumenta o engajamento do paciente no tratamento.',
        instruction: 'Na aba Metas, adicione os objetivos e marque o progresso conforme avançarem.'
      },
      {
        image: '/assets/ajuda/passo5-9-ficha do pacinete-aba contato1.jpg.webp',
        title: 'Contatos de Emergência',
        description: 'Segurança em primeiro lugar. Mantenha os contatos de rede de apoio sempre acessíveis.',
        instruction: 'Preencha os dados de familiares ou médicos de confiança na aba Contato.'
      },
      {
        image: '/assets/ajuda/passo5-10-ficha do pacinete-aba saude1.jpg.webp',
        title: 'Histórico de Saúde',
        description: 'Registre medicações em uso, diagnósticos anteriores e condições físicas relevantes.',
        instruction: 'Utilize a aba Saúde para um prontuário médico-psicológico completo.'
      },
      {
        image: '/assets/ajuda/passo5-10-ficha do pacinete-aba saude2.jpg.webp',
        title: 'Detalhamento Clínico',
        description: 'Informações sobre sono, alimentação e hábitos que influenciam na saúde mental.',
        instruction: 'Mantenha estes dados atualizados para uma análise clínica mais profunda.'
      },
      {
        image: '/assets/ajuda/passo5-11-ficha do pacinete-aba info_indicacao1.jpg.webp',
        title: 'Origem e Indicação',
        description: 'Saiba de onde vêm seus pacientes. Ótimo para entender o crescimento da sua rede.',
        instruction: 'Registre quem indicou o paciente na aba de Informações de Indicação.'
      }
    ]
  },
  {
    id: 'portal',
    title: 'Portal do Paciente',
    icon: MonitorSmartphone,
    slides: [
      {
        image: '/assets/ajuda/passo6-1 portal1.jpg.webp',
        title: 'Sua Clínica na Palma da Mão dele',
        description: 'Um ambiente exclusivo e seguro onde seu paciente encontra tudo o que precisa para o tratamento, fortalecendo o vínculo e a autonomia.',
        instruction: 'Ative os módulos que deseja liberar para o paciente nas configurações da ficha.'
      },
      {
        image: '/assets/ajuda/passo6-2 portal-envio whstasapp2.jpg.webp',
        title: 'Conexão via WhatsApp',
        description: 'Envie o acesso personalizado direto para o celular do paciente. Praticidade que elimina barreiras e facilita o início do cuidado.',
        instruction: 'Clique no ícone do WhatsApp para disparar o link de acesso seguro.'
      },
      {
        image: '/assets/ajuda/passo6-3 portal-link externo pacinete1.jpg.webp',
        title: 'Boas-vindas Digital',
        description: 'A primeira impressão do paciente ao acessar o portal: um layout limpo que destaca a próxima sessão e o tempo restante.',
        instruction: 'Esta é a tela inicial que o paciente visualiza ao clicar no link enviado.'
      },
      {
        image: '/assets/ajuda/passo6-4 portal-link externo pacinete2.jpg.webp',
        title: 'Sua Sala Virtual Pronta',
        description: 'Seus atendimentos online a um clique de distância. O botão de acesso aparece automaticamente 10 minutos antes da sessão.',
        instruction: 'O paciente clica em "Acessar Consulta Agora" para entrar na sala de vídeo.'
      },
      {
        image: '/assets/ajuda/passo6-5 portal-link externo pacinete3.jpg.webp',
        title: 'Documentos Pendentes',
        description: 'O sistema avisa o paciente sobre contratos ou termos que precisam de atenção, garantindo sua segurança jurídica.',
        instruction: 'O alerta de documento pendente aparece em destaque no topo do portal.'
      },
      {
        image: '/assets/ajuda/passo6-6 portal-link externo pacinete3.jpg.webp',
        title: 'Transparência nos Termos',
        description: 'O paciente pode ler o contrato de prestação de serviço e o termo LGPD com clareza antes de realizar a assinatura.',
        instruction: 'O documento abre em um modal de leitura amigável para o paciente.'
      },
      {
        image: '/assets/ajuda/passo6-7 portal-link externo pacinete3.jpg.webp',
        title: 'Assinatura Digital Intuitiva',
        description: 'Formalize o tratamento sem papel. O paciente assina com a ponta do dedo ou mouse, com total validade ética.',
        instruction: 'O paciente utiliza o campo de assinatura para desenhar sua rubrica oficial.'
      },
      {
        image: '/assets/ajuda/passo6-8 portal-link externo pacinete3.jpg.webp',
        title: 'Confirmação de Assinatura',
        description: 'Segurança para ambos. Após assinar, o sistema gera o registro e o documento fica arquivado na ficha do psicólogo.',
        instruction: 'O paciente recebe a confirmação de que o documento foi assinado com sucesso.'
      },
      {
        image: '/assets/ajuda/passo6-9 portal-link externo pacinete3.jpg.webp',
        title: 'Acompanhamento de Metas',
        description: 'O paciente visualiza os objetivos traçados em conjunto, mantendo o foco na sua evolução terapêutica.',
        instruction: 'Na aba Metas do portal, o paciente acompanha o progresso de cada etapa.'
      },
      {
        image: '/assets/ajuda/passo6-10 portal-link externo pacinete3.jpg.webp',
        title: 'Diário de Emoções',
        description: 'Um espaço para o paciente registrar como se sente entre as sessões. Dados valiosos para o seu raciocínio clínico.',
        instruction: 'O paciente escolhe o emoji que representa seu humor e deixa uma breve nota.'
      },
      {
        image: '/assets/ajuda/passo6-11 portal-link externo pacinete3.jpg.webp',
        title: 'Envio de Pautas',
        description: 'O que vamos conversar hoje? O paciente pode adiantar temas, otimizando o tempo precioso da sessão.',
        instruction: 'O registro de pauta fica disponível imediatamente para a leitura do psicólogo.'
      },
      {
        image: '/assets/ajuda/passo6-12 portal-link externo pacinete3.jpg.webp',
        title: 'Financeiro do Paciente',
        description: 'Clareza financeira fortalece a relação. O paciente vê seu histórico de sessões e pagamentos realizados.',
        instruction: 'Na aba Financeiro, o paciente controla seus débitos e créditos na clínica.'
      },
      {
        image: '/assets/ajuda/passo6-13 portal-link externo pacinete3.jpg.webp',
        title: 'Pagamento via Pix',
        description: 'Receber nunca foi tão fácil. O sistema gera o Pix Copia e Cola para pagamento instantâneo com baixa automática.',
        instruction: 'O paciente clica em "Pagar com Pix" e recebe o código para o banco.'
      },
      {
        image: '/assets/ajuda/passo6-14 portal-link externo pacinete3.jpg.webp',
        title: 'Materiais Terapêuticos',
        description: 'A terapia continua fora do consultório. PDFs, vídeos e tarefas enviadas por você ficam guardados aqui.',
        instruction: 'O paciente acessa a aba Materiais para baixar os arquivos compartilhados.'
      },
      {
        image: '/assets/ajuda/passo6-15 portal-link externo pacinete3.jpg.webp',
        title: 'Histórico de Arquivos',
        description: 'Organização mútua. O paciente vê a lista de tudo o que você enviou e o que ele anexou para você.',
        instruction: 'Clique no nome do arquivo para visualizar ou fazer o download.'
      },
      {
        image: '/assets/ajuda/passo6-16 portal-link externo pacinete3.jpg.webp',
        title: 'Anexando Comprovantes',
        description: 'O paciente pode subir fotos de comprovantes ou documentos para sua análise, centralizando a comunicação.',
        instruction: 'O botão de upload permite que o paciente envie arquivos diretamente para a ficha.'
      },
      {
        image: '/assets/ajuda/passo6-17 portal-link externo pacinete3.jpg.webp',
        title: 'Feedback de Envio',
        description: 'A certeza de que a informação chegou. O sistema confirma cada ação do paciente, reduzindo a ansiedade.',
        instruction: 'A mensagem "Enviado com Sucesso" aparece após cada registro no portal.'
      },
      {
        image: '/assets/ajuda/passo6-18 portal-link externo pacinete3.jpg.webp',
        title: 'Autonomia e Cuidado',
        description: 'Com o portal, você oferece um serviço de elite, onde o paciente se sente cuidado em todos os detalhes.',
        instruction: 'Explore o portal como paciente para entender a experiência completa.'
      }
    ]
  },
  {
    id: 'documentos',
    title: 'Documentos',
    icon: FileText,
    slides: [
      {
        image: '/assets/ajuda/passo7-1 documentos.jpg.webp',
        title: 'Sua Gaveta Digital',
        description: 'Todos os seus documentos oficiais organizados e fáceis de encontrar. Segurança e sigilo absoluto para seus laudos e atestados.',
        instruction: 'No menu lateral, clique em Documentos para ver sua listagem completa.'
      },
      {
        image: '/assets/ajuda/passo7-2 documentos.jpg.webp',
        title: 'Emissão Inteligente',
        description: 'Economize tempo precioso. O sistema preenche automaticamente os dados do paciente e os seus, evitando erros de digitação.',
        instruction: 'Clique em + Novo Documento e selecione o modelo desejado.'
      },
      {
        image: '/assets/ajuda/passo7-3 documentos.jpg.webp',
        title: 'Refinando com IA',
        description: 'Um assistente que fala sua língua. Use a IA para ajustar o tom do documento ou focar em queixas específicas de forma profissional.',
        instruction: 'Digite suas instruções e clique em Refinar Termos Oficiais.'
      },
      {
        image: '/assets/ajuda/passo7-4 documentos.jpg.webp',
        title: 'Impressão e Envio',
        description: 'Apresentação que transmite confiança. Gere PDFs timbrados impecáveis e envie direto para o WhatsApp do paciente.',
        instruction: 'Clique em Imprimir para gerar o PDF ou no ícone do WhatsApp para envio rápido.'
      }
    ]
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    icon: DollarSign,
    slides: [
      {
        image: '/assets/ajuda/passo8-1 financeiro.jpg.webp',
        title: 'Sua Clínica no Azul',
        description: 'Acompanhe a saúde financeira do seu negócio em tempo real. Saiba exatamente quanto faturou, o que já recebeu e o que ainda tem a receber.',
        instruction: 'No menu Financeiro, visualize os indicadores de Recebido e A Receber no topo da tela.'
      },
      {
        image: '/assets/ajuda/passo8-2 financeiro.jpg.webp',
        title: 'Lançamentos Inteligentes',
        description: 'Chega de esquecimentos ou planilhas complexas. Registre pagamentos de forma simples e mantenha seu extrato sempre em dia.',
        instruction: 'Clique em + Lançar Recebimento para registrar uma entrada no seu fluxo de caixa.'
      },
      {
        image: '/assets/ajuda/passo8-3 financeiro.jpg.webp',
        title: 'Baixa de Sessões',
        description: 'Mantenha o controle total sobre cada atendimento. Confirme os pagamentos e veja o saldo do paciente ser atualizado automaticamente.',
        instruction: 'Selecione as sessões desejadas e clique em Confirmar Baixa para atualizar o status.'
      },
      {
        image: '/assets/ajuda/passo8-4 financeiro.jpg.webp',
        title: 'Gestão de Recibos Profissionais',
        description: 'Transmita confiança e profissionalismo. Gere recibos timbrados para seus pacientes em segundos, facilitando reembolsos e o IR.',
        instruction: 'Após a baixa, clique em Gerar Recibo para baixar o documento em PDF.'
      },
      {
        image: '/assets/ajuda/passo8-5 financeiro.jpg.webp',
        title: 'Histórico de Transações',
        description: 'Transparência total. Tenha um registro fiel de cada entrada ou saída, garantindo que você nunca se perca nas contas.',
        instruction: 'Role a página para ver o Histórico Completo. Use os filtros para fechamentos mensais.'
      },
      {
        image: '/assets/ajuda/passo8-6 financeiro.jpg.webp',
        title: 'Controle de Inadimplência',
        description: 'Zero estresse com cobranças. Identifique rapidamente quem possui valores pendentes e mantenha sua clínica sustentável.',
        instruction: 'Utilize a aba de Pendentes para visualizar e gerenciar saldos devedores.'
      }
    ]
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    slides: [
      {
        image: '/assets/ajuda/passo9-1 configuracao-perfil.jpg.webp',
        title: 'Seu Perfil Profissional',
        description: 'Sua identidade clínica começa aqui. Configure sua foto, dados de contato e registro do CRP para que todos os seus documentos e receitas saiam impecáveis.',
        instruction: 'Acesse o menu Perfil para atualizar seus dados de registro oficial.'
      },
      {
        image: '/assets/ajuda/passo9-2 configuracao-consultorio.jpg.webp',
        title: 'Dados do Consultório',
        description: 'Mantenha os dados de localização e contato do seu espaço sempre atualizados para facilitar a emissão de recibos e a organização logística dos seus atendimentos.',
        instruction: 'Preencha o endereço completo para que ele apareça corretamente nos cabeçalhos.'
      },
      {
        image: '/assets/ajuda/passo9-3 configuracao-pagamento.jpg.webp',
        title: 'Gestão de Faturamento',
        description: 'Configure como você deseja gerenciar seus ganhos e acompanhe o status das suas integrações financeiras. Defina suas preferências de repasse e cobrança.',
        instruction: 'Verifique se os dados bancários estão corretos para garantir seus recebimentos.'
      },
      {
        image: '/assets/ajuda/passo9-4 configuracao-pagamento.jpg.webp',
        title: 'Histórico Financeiro da Conta',
        description: 'Transparência total sobre sua assinatura do MentePsi e histórico de transações da sua clínica. Acompanhe o extrato de movimentações.',
        instruction: 'Revise o extrato de faturamento e taxas na aba de Pagamentos Avançados.'
      },
      {
        image: '/assets/ajuda/passo9-5 configuracao-lembretes.jpg.webp',
        title: 'Lembretes Automáticos (WhatsApp)',
        description: 'Reduza as faltas em até 80%. O sistema envia avisos automáticos para seus pacientes antes de cada sessão, garantindo constância no tratamento.',
        instruction: 'Ative a chave de automação e personalize a mensagem de lembrete.'
      },
      {
        image: '/assets/ajuda/passo9-6 configuracao-status plano.jpg.webp',
        title: 'Gestão do seu Plano',
        description: 'Acompanhe seu período de uso, dias restantes de teste ou detalhes da sua assinatura ativa no MentePsi. Transparência sobre seu investimento.',
        instruction: 'Verifique seu status atual e gerencie as opções de upgrade ou renovação.'
      },
      {
        image: '/assets/ajuda/passo9-7 configuracao-convite assitente.jpg.webp',
        title: 'Convite para Assistentes',
        description: 'Delegue tarefas administrativas com segurança. Convide uma secretária para gerenciar sua agenda e financeiro, mantendo o sigilo clínico.',
        instruction: 'Digite o e-mail do colaborador e defina o nível de acesso autorizado.'
      }
    ]
  }
];

export default function TutoriaisPage() {
  const [activeModule, setActiveModule] = useState(helpModules[0].id)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false) // NOVO: Estado para o Zoom

  const handleModuleChange = (id: string) => {
    setActiveModule(id)
    setCurrentSlide(0)
  }

  const moduleData = helpModules.find(m => m.id === activeModule) || helpModules[0]
  const slideData = moduleData.slides[currentSlide]
  const totalSlides = moduleData.slides.length

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setIsFading(true)
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1)
        setIsFading(false)
      }, 200)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setIsFading(true)
      setTimeout(() => {
        setCurrentSlide(prev => prev - 1)
        setIsFading(false)
      }, 200)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 h-auto md:h-screen flex-shrink-0 flex flex-col sticky top-0 z-20">
        <div className="p-6 border-b border-slate-100 hidden md:block">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="text-teal-600 h-6 w-6" /> MentePsi
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Central de Ajuda e Sucesso</p>
        </div>

        <div className="overflow-x-auto md:overflow-y-auto flex-1 p-4 flex md:flex-col gap-2 no-scrollbar">
          {helpModules.map((module) => {
            const Icon = module.icon
            const isActive = activeModule === module.id
            return (
              <button
                key={module.id}
                onClick={() => handleModuleChange(module.id)}
                className={`flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3 p-3 rounded-xl transition-all min-w-[100px] md:min-w-0 flex-shrink-0 text-left
                  ${isActive 
                    ? 'bg-teal-50 border-teal-200 text-teal-700 font-bold border' 
                    : 'bg-transparent text-slate-500 hover:bg-slate-50 font-medium border border-transparent hover:border-slate-100'
                  }
                `}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-teal-100/50' : 'bg-slate-100'}`}>
                  <Icon size={18} className={isActive ? 'text-teal-600' : 'text-slate-400'} />
                </div>
                <span className="text-xs md:text-sm md:mt-2 line-clamp-1">{module.title}</span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-10">
        <div className="max-w-5xl mx-auto w-full">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{moduleData.title}</h2>
              <p className="text-slate-500 font-medium">Passo {currentSlide + 1} de {totalSlides}</p>
            </div>
          </div>

          {/* VISUALIZADOR COM CLIQUE PARA AMPLIAR */}
          <div 
            onClick={() => setIsZoomed(true)}
            className="relative aspect-video bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 flex items-center justify-center cursor-zoom-in group"
          >
            <div className={`w-full h-full transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <Image 
                src={slideData.image} 
                alt={slideData.title}
                fill
                className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
                unoptimized
              />
            </div>

            {/* Overlay de indicação de Zoom */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
               <Sparkles className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={32} />
            </div>

            <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} disabled={currentSlide === 0} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg disabled:opacity-20 z-10">
              <ChevronLeft size={24} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} disabled={currentSlide === totalSlides - 1} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg disabled:opacity-20 z-10">
              <ChevronRight size={24} />
            </button>
          </div>

          {/* LEGENDA */}
          <div className={`mt-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <Badge className="bg-teal-50 text-teal-700 mb-4 px-3 py-1 border-teal-200">
              DICA: {slideData.instruction}
            </Badge>
            <h3 className="text-2xl font-black text-teal-700 mb-3">{slideData.title}</h3>
            <p className="text-slate-600 text-lg leading-relaxed">{slideData.description}</p>
          </div>
        </div>
      </main>

      {/* NOVO: MODAL DE ZOOM (LIGHTBOX) */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Image 
              src={slideData.image} 
              alt={slideData.title}
              fill
              className="object-contain"
              unoptimized
            />
            <button 
              className="absolute top-4 right-4 md:top-8 md:right-8 text-white bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all shadow-lg backdrop-blur-md"
              onClick={() => setIsZoomed(false)}
            >
              <span className="text-sm md:text-base font-bold flex items-center gap-2">✕ Sair do Zoom</span>
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP */}
      <a href="https://wa.me/5516981518607" target="_blank" className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center gap-3 font-bold hover:scale-105 transition-all">
        <MessageCircle size={24} />
        <span className="hidden md:block">Suporte MentePsi</span>
      </a>
    </div>
  )
}