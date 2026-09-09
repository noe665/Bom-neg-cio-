const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const oldEndpoint = code.substring(code.indexOf("app.post('/api/generate-form-questions'"), code.indexOf("if (process.env.NODE_ENV !== 'production')"));

const newEndpoint = `app.post('/api/generate-form-questions', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData } = req.body;
      
      const prompt = \`Você é um especialista em pesquisa de mercado.
Sua tarefa é criar 5 a 7 perguntas estratégicas para um formulário de pesquisa de mercado.
O objetivo é validar a aceitação do produto/serviço junto ao público-alvo, entender suas necessidades, dores e percepção de valor. Inclua uma mistura de perguntas de múltipla escolha (radio) e abertas (textarea).

DADOS DO PROJETO:
- Nome: \${projectData.name}
- Tipo: \${projectData.type}
- Visão: \${projectData.vision}
- Missão: \${projectData.mission}
- Público-Alvo: \${projectData.targetAudience}

INSTRUÇÕES DE FORMATAÇÃO:
Retorne APENAS um array JSON válido (sem blocos de código ou markdown) contendo objetos com a seguinte estrutura:
[{
  "title": "Texto da pergunta",
  "type": "radio" | "checkbox" | "textarea" | "text",
  "options": ["Opção 1", "Opção 2"] // apenas se for radio ou checkbox
}]\`;
      
      const generateWithRetry = async (ai, prompt, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            let text = response.text || '';
            text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
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

  `;

code = code.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('server.ts', code);
