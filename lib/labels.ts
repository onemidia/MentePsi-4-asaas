export interface LabelVariations {
  singular: string;
  plural: string;
  artigo: 'o' | 'a';
  verbos: {
    agendar: string;
    realizar: string;
  };
}

export function getLabels(label?: string): LabelVariations {
  const normalized = label?.toLowerCase().trim();

  switch (normalized) {
    case 'consulta':
      return {
        singular: 'Consulta',
        plural: 'Consultas',
        artigo: 'a',
        verbos: {
          agendar: 'Agendar Consulta',
          realizar: 'Realizar Consulta',
        },
      };
      
    case 'atendimento':
      return {
        singular: 'Atendimento',
        plural: 'Atendimentos',
        artigo: 'o',
        verbos: {
          agendar: 'Agendar Atendimento',
          realizar: 'Realizar Atendimento',
        },
      };

    case 'sessão':
    case 'sessao':
    default:
      return {
        singular: 'Sessão',
        plural: 'Sessões',
        artigo: 'a',
        verbos: {
          agendar: 'Agendar Sessão',
          realizar: 'Realizar Sessão',
        },
      };
  }
}