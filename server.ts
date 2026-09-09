import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // API route for generating recommendation with Gemini
  app.post('/api/recommendation', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData, indicators, cashFlow } = req.body;
      const formatNumber = (num: number | null | undefined, suffix: string = '') => {
        if (num === null || num === undefined) return 'N/A';
        return num.toFixed(2) + suffix;
      };
      
      const prompt = `Você é um consultor financeiro sênior avaliando a viabilidade de um novo negócio.Baseado nos seguintes dados do projeto e indicadores financeiros, forneça um parágrafo de feedback automático explicando os pontos fortes ou fracos do negócio.Seja direto, profissional e focado nos números apresentados.Dados do Projeto:- Nome: ${projectData.name}- Tipo: ${projectData.type}- Visão: ${projectData.vision}- Missão: ${projectData.mission}- Investimento Inicial: R$ ${projectData.initialInvestment}- Tolerância de Perda (TMA): ${projectData.lossTolerance}%- Horizonte (n): ${projectData.horizon} anosIndicadores Calculados:- VPL (Valor Presente Líquido): R$ ${formatNumber(indicators.vpl)}- TIR (Taxa Interna de Retorno): ${formatNumber(indicators.tir, '%')}- Payback Simples: ${formatNumber(indicators.paybackSimples, ' anos')}- Payback Descontado: ${formatNumber(indicators.paybackDescontado, ' anos')}- Índice de Lucratividade (IL): ${formatNumber(indicators.il)}- Média de Viabilização (MV): ${formatNumber(indicators.mv)}Fluxo de Caixa Anual (R$):${cashFlow.map((cf: number, i: number) => `Ano ${i+1}: R$ ${cf.toFixed(2)}`).join('\n')}Forneça APENAS o parágrafo de recomendação, sem introduções ou formatação markdown adicional.`;
      
      const generateWithRetry = async (ai: GoogleGenAI, prompt: string, retries = 3): Promise<string> => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            return response.text || '';
          } catch (error: any) {
            if (error?.status === 'UNAVAILABLE' || error?.status === 503 || error?.status === 429) {
              if (i === retries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            } else {
              throw error;
            }
          }
        }
        return '';
      };
      
      const recommendationText = await generateWithRetry(ai, prompt);
      res.json({ recommendation: recommendationText });
    } catch (error: any) {
      console.error('Error generating recommendation:', error);
      res.status(500).json({ error: 'Failed to generate recommendation', details: error.message });
    }
  });

  // API route for generating business plan
  app.post('/api/generate-business-plan', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData, indicators, cashFlow, planType } = req.body;
      
      const formatNumber = (num: number | null | undefined, suffix: string = '') => {
        if (num === null || num === undefined) return 'N/A';
        return num.toFixed(2) + suffix;
      };

      const prompt = `Atue como um consultor estratégico especialista em criação de negócios.
Você deve redigir um Plano de Negócio para a seguinte empresa, baseado ESTRITAMENTE no formato: ${planType}.

DADOS DO PROJETO:
- Nome: ${projectData.name}
- Autor: ${projectData.authorName || 'Não informado'}
- Tipologia: ${projectData.type}
- Produto Específico: ${projectData.specificProductName || 'N/A'}
- Localização: ${projectData.location || 'Não informada'}
- Visão: ${projectData.vision}
- Missão: ${projectData.mission}
- Público-Alvo: ${projectData.targetAudience}
- Investimento Inicial: ${projectData.currency} ${projectData.initialInvestment}

INDICADORES FINANCEIROS:
- VPL: ${projectData.currency} ${formatNumber(indicators.vpl)}
- TIR: ${formatNumber(indicators.tir, '%')}
- Payback Descontado: ${formatNumber(indicators.paybackDescontado, ' anos')}

INSTRUÇÕES OBRIGATÓRIAS DE CONTEÚDO:
Independente do formato escolhido (${planType}), o plano DEVE CONTER OBRIGATORIAMENTE OS 5 PILARES ABAIXO:
1. Proposta de Valor e Problema (A dor resolvida e o diferencial)
2. Análise de Mercado e Cliente (Tamanho do mercado, concorrentes diretos e indiretos, perfil detalhado do cliente)
3. Estratégia de Vendas e Marketing (Atração, conversão, retenção e canais de distribuição)
4. Viabilidade Financeira (Uso do investimento, custos fixos e variáveis, fluxo de caixa e break-even point com base nos indicadores fornecidos)
5. Capacidade Operacional e Equipe (Processos diários, logística, tecnologia e competências necessárias da equipe fundadora)

INSTRUÇÕES DE FORMATAÇÃO:
A sua resposta será exportada DIRETAMENTE para um documento PDF.
1. NÃO USE formatação markdown como negrito (**), itálico (*), ou hashtags (#).
2. Use APENAS texto simples.
3. Para separar seções, use TÍTULOS EM LETRAS MAIÚSCULAS.
4. Pule linhas em branco entre parágrafos para organizar a leitura.

Comece o documento com o título do projeto em maiúsculas, seguido de uma breve introdução, e depois os 5 pilares detalhados.`;

      const generateWithRetry = async (ai: GoogleGenAI, prompt: string, retries = 3): Promise<string> => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            return response.text || '';
          } catch (error: any) {
            if (error?.status === 'UNAVAILABLE' || error?.status === 503 || error?.status === 429) {
              if (i === retries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            } else {
              throw error;
            }
          }
        }
        return '';
      };

      const businessPlanText = await generateWithRetry(ai, prompt);
      res.json({ businessPlan: businessPlanText });
    } catch (error: any) {
      console.error('Error generating business plan:', error);
      res.status(500).json({ error: 'Failed to generate business plan', details: error.message });
    }
  });

  app.post('/api/generate-social-project', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData } = req.body;
      
      const prompt = `Atue como um especialista em elaboração de projetos sociais e captação de recursos.
Você deve redigir a apresentação de um projeto social focado em atrair investidores e apoiadores.

DADOS DO PROJETO:
- Nome: ${projectData.name}
- Investidor/Autor: ${projectData.investorName || 'Não informado'}
- Orçamento: ${projectData.currency || 'BRL'} ${projectData.projectBudget || '0'}
- Dor Social Urgente: ${projectData.socialPain || 'Não informada'}
- Ganhos do Investidor: ${projectData.investorGains || 'Não informado'}
- Sustentabilidade: ${projectData.sustainability || 'Não informada'}
- Visão: ${projectData.vision}
- Missão: ${projectData.mission}
- Público-Alvo: ${projectData.targetAudience}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
A resposta deve ser extensa o suficiente para preencher cerca de 4 páginas A4.
Separe claramente cada uma das 4 partes abaixo usando a tag [PAGE_BREAK].
Não use formatação markdown (sem ** ou #). Use texto simples, parágrafos bem desenvolvidos e títulos principais em LETRAS MAIÚSCULAS. Use marcadores ("•") para listar pontos importantes, simulando uma apresentação executiva profissional. Use uma linguagem altamente atrativa, persuasiva e inspiradora para potenciais investidores.

Parte 1 (Página 2): Apresentação do Projeto (Da história da criação da ideia até a definição da ideia).
[PAGE_BREAK]
Parte 2 (Página 3): A Dor Social e o Público-Alvo (Exploração profunda do problema e quem sofre com ele).
[PAGE_BREAK]
Parte 3 (Página 4): Solução, Missão e Visão (Como o projeto atua, visão de futuro e missão).
[PAGE_BREAK]
Parte 4 (Página 5): Investimento, Sustentabilidade e Ganhos (Orçamento, como se mantém e o que o investidor ganha com isso).
`;

      const generateWithRetry = async (ai: GoogleGenAI, prompt: string, retries = 3): Promise<string> => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            return response.text || '';
          } catch (error: any) {
            if (error?.status === 'UNAVAILABLE' || error?.status === 503 || error?.status === 429) {
              if (i === retries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            } else {
              throw error;
            }
          }
        }
        return '';
      };

      const projectText = await generateWithRetry(ai, prompt);
      res.json({ projectText });
    } catch (error: any) {
      console.error('Error generating social project:', error);
      res.status(500).json({ error: 'Failed to generate social project', details: error.message });
    }
  });

  app.post('/api/suggest-estimates', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData } = req.body;
      
      const isSocial = projectData.type === 'Sem fim lucrativo';
      const prompt = `Você é um consultor financeiro especialista em projeções de mercado.
Sua tarefa é estimar valores realistas e coerentes para o fluxo de caixa ou captação de recursos de um negócio ou projeto, considerando as informações fornecidas.
MUITO IMPORTANTE: Os valores devem ser numéricos brutos (apenas o número, sem formatação de moeda).
Use o tipo de moeda do projeto como referência para a grandeza dos valores, mas retorne apenas números simples. A moeda selecionada é: ${projectData.currency || 'BRL'}.

DADOS DO PROJETO:
- Nome: ${projectData.name}
- Tipo: ${projectData.type}
- Orçamento / Investimento Inicial: ${projectData.projectBudget || projectData.initialInvestment || 0}
- Público-Alvo: ${projectData.targetAudience}

Se o projeto for "Sem fim lucrativo", estime os seguintes campos (mensal/anual baseados no orçamento):
- monthlyContribution (Contribuição Mensal total esperada de pequenos doadores)
- yearlyPartnerSupport (Apoio Anual total esperado de parceiros empresariais/patrocinadores)
- stateSupport (Apoio do Estado Anual esperado - pode ser 0 se não for aplicável)

Se o projeto for de fins lucrativos, estime os seguintes campos (lucro/faturamento mensal esperado, coerente com o investimento):
- min (Faturamento/Lucro Mínimo Mensal realista)
- med (Faturamento/Lucro Médio Mensal realista)
- max (Faturamento/Lucro Máximo Mensal otimista)

INSTRUÇÕES DE FORMATAÇÃO:
Retorne APENAS um objeto JSON válido (sem markdown, sem \`\`\`json).
Se for "Sem fim lucrativo": {"monthlyContribution": numero, "yearlyPartnerSupport": numero, "stateSupport": numero}
Caso contrário: {"min": numero, "med": numero, "max": numero}`;

      const generateWithRetry = async (ai: GoogleGenAI, prompt: string, retries = 3): Promise<any> => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            let text = response.text || '';
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
          } catch (error: any) {
            if (error?.status === 'UNAVAILABLE' || error?.status === 503 || error?.status === 429) {
              if (i === retries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            } else if (error instanceof SyntaxError && i < retries - 1) {
              // Retry on JSON parse error
            } else {
              throw error;
            }
          }
        }
        return null;
      };
      
      const estimates = await generateWithRetry(ai, prompt);
      res.json({ estimates });
    } catch (error: any) {
      console.error('Error suggesting estimates:', error);
      res.status(500).json({ error: 'Failed to suggest estimates', details: error.message });
    }
  });

  app.post('/api/generate-form-questions', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData } = req.body;
      
      const prompt = `Você é um especialista em pesquisa de mercado.
Sua tarefa é criar 5 a 7 perguntas estratégicas para um formulário de pesquisa de mercado.
O objetivo é validar a aceitação do produto/serviço junto ao público-alvo, entender suas necessidades, dores e percepção de valor. Inclua uma mistura de perguntas de múltipla escolha (radio) e abertas (textarea).

DADOS DO PROJETO:
- Nome: ${projectData.name}
- Autor: ${projectData.authorName || 'Não informado'}
- Tipo: ${projectData.type}
- Produto Específico: ${projectData.specificProductName || 'N/A'}
- Localização: ${projectData.location || 'Não informada'}
- Visão: ${projectData.vision}
- Missão: ${projectData.mission}
- Público-Alvo: ${projectData.targetAudience}

INSTRUÇÕES DE FORMATAÇÃO:
Retorne APENAS um array JSON válido (sem blocos de código ou markdown) contendo objetos com a seguinte estrutura:
[{
  "title": "Texto da pergunta",
  "type": "radio" | "checkbox" | "textarea" | "text",
  "options": ["Opção 1", "Opção 2"] // apenas se for radio ou checkbox
}]`;
      
      const generateWithRetry = async (ai, prompt, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            let text = response.text || '';
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
          } catch (error) {
            if (error?.status === 'UNAVAILABLE' || error?.status === 503 || error?.status === 429) {
              if (i === retries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            } else if (error instanceof SyntaxError && i < retries - 1) {
              // Retry on JSON parse error
            } else {
              throw error;
            }
          }
        }
        return [];
      };
      
      const questions = await generateWithRetry(ai, prompt);
      res.json({ questions });
    } catch (error) {
      console.error('Error generating form questions:', error);
      res.status(500).json({ error: 'Failed to generate questions', details: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
