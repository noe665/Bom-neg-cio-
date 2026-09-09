const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `
  app.post('/api/generate-form-questions', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const { projectData } = req.body;
      
      const prompt = \`Você é um especialista em pesquisa de mercado.
Sua tarefa é criar 5 a 7 perguntas abertas e estratégicas para um formulário de pesquisa de mercado.
O objetivo é validar a aceitação do produto/serviço junto ao público-alvo, entender suas necessidades, dores e percepção de valor.

DADOS DO PROJETO:
- Nome: \${projectData.name}
- Tipo: \${projectData.type}
- Visão: \${projectData.vision}
- Missão: \${projectData.mission}
- Público-Alvo: \${projectData.targetAudience}

INSTRUÇÕES DE FORMATAÇÃO:
1. Forneça APENAS as perguntas, uma por linha.
2. Não adicione números antes das perguntas.
3. Não adicione introduções ou formatação markdown.\`;
      
      const generateWithRetry = async (ai, prompt, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            return response.text || '';
          } catch (error) {
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
      
      const rawText = await generateWithRetry(ai, prompt);
      const questions = rawText.split('\\n').map(q => q.trim().replace(/^\\d+\\.\\s*/, '').replace(/^-+\\s*/, '')).filter(q => q.length > 5);
      
      res.json({ questions: questions.slice(0, 10) });
    } catch (error) {
      console.error('Error generating form questions:', error);
      res.status(500).json({ error: 'Failed to generate questions', details: error.message });
    }
  });
`;

const insertIndex = content.indexOf('if (process.env.NODE_ENV');
const updatedContent = content.slice(0, insertIndex) + newEndpoint + content.slice(insertIndex);
fs.writeFileSync('server.ts', updatedContent);
