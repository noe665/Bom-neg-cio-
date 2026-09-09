import { getCachedTokenSync, googleSignIn } from './auth';

export async function createMarketResearchForm(projectName: string, vision: string, mission: string, questions: string[]) {
  let token = getCachedTokenSync();
  if (!token) {
    const result = await googleSignIn();
    token = result?.accessToken || null;
  }
  
  if (!token) {
    throw new Error('User not authenticated');
  }

  // 1. Create Form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: `Pesquisa de Mercado: ${projectName}`,
        documentTitle: `Pesquisa: ${projectName}`
      }
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Create Form Error:', errText);
    throw new Error('Failed to create form: ' + errText);
  }

  const form = await createRes.json();
  const formId = form.formId;

  // 2. Build requests
  const requests: any[] = [
    {
      updateFormInfo: {
        info: {
          description: `Visão: ${vision}\nMissão: ${mission}\n\nEsta pesquisa visa validar a aceitação deste produto/serviço no mercado.`,
        },
        updateMask: 'description'
      }
    }
  ];

  // Add the dynamic questions
  questions.forEach((qTitle, index) => {
    requests.push({
      createItem: {
        item: {
          title: qTitle,
          questionItem: {
            question: {
              required: true,
              textQuestion: { paragraph: true }
            }
          }
        },
        location: { index }
      }
    });
  });

  // 3. Batch Update
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error('Update Form Error:', errText);
    throw new Error('Failed to update form: ' + errText);
  }

  return form.responderUri;
}
