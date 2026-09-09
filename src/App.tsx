import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Activity, TrendingUp, Calculator, ArrowRight, ArrowLeft, RotateCcw, CheckCircle, XCircle, FileSpreadsheet, ExternalLink, Download, Info, ChevronRight, ChevronLeft, FileText, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
import { calculateNPV, calculateIRR, calculatePaybackSimples, calculatePaybackDescontado, calculateIL, calculateMV } from './lib/finance';
import { initAuth, getAccessToken, getCachedTokenSync, googleSignIn } from './lib/auth';
import { createMarketResearchForm } from './lib/forms';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import type { ProjectData, MonthlyEstimates, Indicators, FormQuestion } from './types';
import businessPersonImg from './assets/images/regenerated_image_1786925496251.png';
import bgImage from './assets/images/financial_bg_bom_negocio_1786926337559.jpg';
import bgImageInternal from './assets/images/financial_charts_bg_1786925849768.jpg';
import logoImg from './assets/images/bom_negocio_logo_1787132198359.jpg';

const INITIAL_PROJECT_DATA: ProjectData = {
  name: '',
  type: 'Venda de produto específico',
  location: '',
  specificProductName: '',
  authorName: '',
  vision: '',
  mission: '',
  initialInvestment: 0,
  currency: 'BRL',
  localCurrency: 'BRL',
  exchangeRate: 1,
  fundingType: 'Negócio próprio',
  targetAudience: '',
  lossTolerance: 15,
  horizon: 3,
  socialPain: '',
  investorName: '',
  projectBudget: 0,
  investorGains: '',
  sustainability: ''
};

const INITIAL_ESTIMATES: MonthlyEstimates = {
  min: 0,
  med: 0,
  max: 0
};

const formatCurrency = (val: any, currency: string) => {
  if (val === null || val === undefined) return '';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('pt-BR', { style: 'currency', currency });
};

export default function App() {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_PROJECT_DATA);
  const [estimates, setEstimates] = useState<MonthlyEstimates>(INITIAL_ESTIMATES);
  const [flowProfile, setFlowProfile] = useState<'Pessimista' | 'Otimista'>('Pessimista');
  
  const [cashFlow, setCashFlow] = useState<number[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [recommendation, setRecommendation] = useState<string>('');
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isGeneratingForm, setIsGeneratingForm] = useState(false);
  const [marketQuestions, setMarketQuestions] = useState<FormQuestion[]>([]);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpSlideStep, setHelpSlideStep] = useState(1);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planType, setPlanType] = useState('Plano de Negócio Tradicional (Completo)');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSuggestingEstimates, setIsSuggestingEstimates] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (projectData.currency === projectData.localCurrency) {
      setProjectData(prev => ({ ...prev, exchangeRate: 1 }));
      return;
    }
    
    const fetchRate = async () => {
      setIsFetchingRate(true);
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${projectData.currency}`);
        const data = await response.json();
        if (data && data.rates && data.rates[projectData.localCurrency]) {
          setProjectData(prev => ({ ...prev, exchangeRate: data.rates[projectData.localCurrency] }));
        }
      } catch (error) {
        console.error("Failed to fetch exchange rate", error);
      } finally {
        setIsFetchingRate(false);
      }
    };
    
    fetchRate();
    const interval = setInterval(fetchRate, 60000); // Atualiza automaticamente a cada 60 segundos
    
    return () => clearInterval(interval);
  }, [projectData.currency, projectData.localCurrency]);

  const handleRefreshExchangeRate = async () => {
    if (projectData.currency === projectData.localCurrency) return;
    setIsFetchingRate(true);
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${projectData.currency}`);
      const data = await response.json();
      if (data && data.rates && data.rates[projectData.localCurrency]) {
        setProjectData(prev => ({ ...prev, exchangeRate: data.rates[projectData.localCurrency] }));
      }
    } catch (error) {
      console.error("Failed to fetch exchange rate", error);
    } finally {
      setIsFetchingRate(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const handleGenerateForm = async () => {
    setIsGeneratingForm(true);
    try {
      const response = await fetch('/api/generate-form-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData })
      });
      
      let questions: FormQuestion[] = [
        { title: 'Qual o seu nível de interesse nesta ideia?', type: 'radio', options: ['Muito interessado', 'Interessado', 'Pouco interessado', 'Nenhum interesse'] },
        { title: 'Quanto você estaria disposto a pagar por isso?', type: 'text' },
        { title: 'Quais funcionalidades não podem faltar?', type: 'textarea' }
      ];

      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
           questions = data.questions;
        }
      }

      setMarketQuestions(questions);
      setShowQuestionsModal(true);
    } catch (err: any) {
      console.error('Failed to generate questions:', err);
      alert('Falha ao gerar as perguntas da pesquisa.');
    } finally {
      setIsGeneratingForm(false);
    }
  };

  // Generates Cash Flow based on profile
  const generateCashFlow = () => {
    const { horizon, type } = projectData;
    const { min, med, max, monthlyContribution, yearlyPartnerSupport, stateSupport } = estimates;
    const flow: number[] = [];

    let yearlyMin = min * 12;
    let yearlyMed = med * 12;
    let yearlyMax = max * 12;

    if (type === 'Sem fim lucrativo') {
      const baseSupport = ((monthlyContribution || 0) * 12) + (yearlyPartnerSupport || 0) + (stateSupport || 0);
      yearlyMin = baseSupport * 0.8;
      yearlyMed = baseSupport;
      yearlyMax = baseSupport * 1.2;
    }

    for (let i = 0; i < horizon; i++) {
      if (flowProfile === 'Pessimista') {
        // Pessimistic: Valores flutuando em torno do mínimo, incluindo a possibilidade real de anos com fluxo negativo (prejuízo)
        const chance = Math.random();
        
        if (i === 0) {
          // Ano 1: Alto risco de prejuízo inicial na adaptação do negócio
          flow.push(yearlyMin * (Math.random() * 0.8 - 0.4)); // Pode ir de -40% a +40% do lucro mínimo
        } else if (chance < 0.3) {
          // 30% de chance de um ano ruim com prejuízo
          flow.push(yearlyMin * (Math.random() * 0.5 - 0.5)); // Pode ir de -50% a 0% do lucro mínimo (sempre negativo ou zero)
        } else if (chance < 0.8) {
          // 50% de chance de um ano fraco, variando positivamente mas abaixo do mínimo ideal
          flow.push(yearlyMin * (0.2 + Math.random() * 0.6)); // 20% a 80% do mínimo
        } else {
          // 20% de chance de um ano "ok" para o cenário ruim, chegando perto da média
          flow.push(yearlyMed * (0.5 + Math.random() * 0.4)); // 50% a 90% da média
        }
      } else {
        // Optimistic: Fluxo realista flutuando em torno da MÉDIA, com eventuais picos para o máximo
        const chance = Math.random();

        if (i === 0) {
          // Ano 1: Realista, atinge o mínimo esperado com facilidade, ou um pouco mais
          flow.push(yearlyMin * (0.8 + Math.random() * 0.4)); 
        } else if (chance < 0.5) {
          // 50% de chance de bater a média (rendimento realista esperado)
          flow.push(yearlyMed * (0.9 + Math.random() * 0.2)); // 90% a 110% da média
        } else if (chance < 0.8) {
          // 30% de chance de superar a média e encostar no máximo
          flow.push(yearlyMed + ((yearlyMax - yearlyMed) * (0.4 + Math.random() * 0.4))); 
        } else {
          // 20% de chance de ser um ano excelente, batendo ou até levemente ultrapassando o máximo projetado
          flow.push(yearlyMax * (0.95 + Math.random() * 0.15)); // 95% a 110% do máximo
        }
      }
    }
    setCashFlow(flow);
  };

  const calculateFinancialIndicators = async () => {
    const tma = projectData.lossTolerance / 100;
    const fc0 = projectData.initialInvestment;
    
    const vpl = calculateNPV(tma, fc0, cashFlow);
    const tir = calculateIRR(fc0, cashFlow);
    const paybackSimples = calculatePaybackSimples(fc0, cashFlow);
    const paybackDescontado = calculatePaybackDescontado(tma, fc0, cashFlow);
    const il = calculateIL(tma, fc0, cashFlow);
    const mv = calculateMV(tir, tma, il, vpl, fc0, projectData.horizon, paybackDescontado);

    const calculatedIndicators = { 
      vpl, 
      tir: isNaN(tir) ? NaN : tir * 100, 
      paybackSimples, 
      paybackDescontado, 
      il, 
      mv: isNaN(mv) ? 0 : mv 
    };
    setIndicators(calculatedIndicators);
    setStep(4);
    
    // Fetch recommendation from Gemini
    setLoadingRecommendation(true);
    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData, indicators: calculatedIndicators, cashFlow })
      });
      const data = await response.json();
      if (data.recommendation) {
        setRecommendation(data.recommendation);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const PLAN_TYPES = [
    { title: "Plano de Negócio Tradicional (Completo)", desc: "Documento detalhado e estruturado. Ideal para apresentar a bancos e investidores." },
    { title: "Business Model Canvas (BMC)", desc: "Modelo visual e dinâmico focado no ecossistema da empresa em apenas uma página/quadro." },
    { title: "Plano de Negócio Lean (Enxuto)", desc: "Versão simplificada do modelo tradicional, focada apenas nos pontos críticos do negócio." },
    { title: "Plano Operacional ou Funcional", desc: "Focado na execução prática e no dia a dia da empresa (processos, logística, equipe)." },
    { title: "One-Page Plan (Plano de Uma Página)", desc: "Resumo executivo ultracondensado para potenciais sócios ou em eventos de pitch." }
  ];

  const generateBusinessPlan = async () => {
    if (!indicators || cashFlow.length === 0) return;
    
    setIsGeneratingPlan(true);
    setGeneratedPlan(null);
    try {
      const response = await fetch('/api/generate-business-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData, indicators, cashFlow, planType })
      });
      const data = await response.json();
      if (data.businessPlan) {
        setGeneratedPlan(data.businessPlan);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const downloadBusinessPlanPDF = async () => {
    if (!generatedPlan) return;
    const doc = new jsPDF({ format: 'a4' });
    
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; 
    });

    const margin = 25.4; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const textWidth = pageWidth - (margin * 2);

    // --- CAPA ---
    if (img.complete && img.naturalWidth > 0) {
      doc.addImage(img, 'JPEG', (pageWidth - 40) / 2, 30, 40, 40);
    }

    doc.setFont("times", "bold");
    doc.setFontSize(20);
    const title = `Plano de Negócio "${projectData.name || 'Projeto'}"`;
    doc.text(title, pageWidth / 2, 100, { align: 'center' });

    doc.setFont("times", "normal");
    doc.setFontSize(14);
    const author = projectData.authorName || 'Autor não informado';
    
    // Split author to multiple lines if needed and center
    const authorLines = doc.splitTextToSize(`Autor(es): ${author}`, textWidth);
    let authorY = 130;
    authorLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, authorY, { align: 'center' });
      authorY += 7;
    });

    authorY += 5;
    doc.text("__________________________________", pageWidth / 2, authorY, { align: 'center' });
    doc.setFontSize(10);
    doc.text("Assinatura", pageWidth / 2, authorY + 5, { align: 'center' });

    // Desenho / Quadro da Visão e Missão para dar ênfase
    doc.setDrawColor(20, 2, 66); // Dark blue/purple
    doc.setFillColor(245, 245, 255);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, 170, textWidth, 60, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont("times", "bolditalic");
    doc.text("A Nossa Visão:", margin + 5, 180);
    doc.setFont("times", "italic");
    const visionLines = doc.splitTextToSize(projectData.vision || 'Não especificada', textWidth - 10);
    doc.text(visionLines.slice(0, 3), margin + 5, 188); // limit to 3 lines

    doc.setFont("times", "bolditalic");
    doc.text("A Nossa Missão:", margin + 5, 208);
    doc.setFont("times", "italic");
    const missionLines = doc.splitTextToSize(projectData.mission || 'Não especificada', textWidth - 10);
    doc.text(missionLines.slice(0, 3), margin + 5, 216); 

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    const dateLoc = `${projectData.location || 'Local não informado'}, ${new Date().toLocaleDateString('pt-BR')}`;
    doc.text(dateLoc, pageWidth / 2, pageHeight - 30, { align: 'center' });

    // --- FUNÇÃO PARA HEADER (Logotipo e Numeração) ---
    let pageNum = 2;
    const addHeader = () => {
       if (img.complete && img.naturalWidth > 0) {
         doc.addImage(img, 'JPEG', margin, 10, 15, 15);
       }
       doc.setFont("times", "normal");
       doc.setFontSize(10);
       doc.text(String(pageNum), pageWidth - margin, 15, { align: 'right' });
       doc.setFontSize(12);
    };

    // --- PÁGINA 2: INTRODUÇÃO ---
    doc.addPage();
    addHeader();
    let yPos = 40;

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("Introdução", margin, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setFont("times", "normal");
    const introText = `Este documento apresenta o plano de negócio para o projeto "${projectData.name}", estruturado segundo o modelo de "${projectData.type}". O relatório gerado tem como objetivo fornecer uma visão estratégica e detalhada, orientando os próximos passos, a alocação de recursos e as perspectivas de crescimento do negócio no seu mercado de atuação.`;
    
    const introLines = doc.splitTextToSize(introText, textWidth);
    introLines.forEach((line: string, idx: number) => {
       doc.text(line, margin, yPos, { maxWidth: textWidth, align: (idx === introLines.length - 1) ? 'left' : 'justify' });
       yPos += 7.5; // Espaçamento 1.5
    });

    // --- PÁGINAS SEGUINTES: CONTEÚDO DO PLANO ---
    doc.addPage();
    pageNum++;
    addHeader();
    yPos = 40;

    const paragraphs = generatedPlan.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    const lineSpacing = 7.5; // ~1.5 spacing for 12pt font

    paragraphs.forEach(para => {
      let isHeading = false;
      let textToPrint = para;
      
      if (textToPrint.startsWith('#')) {
        isHeading = true;
        textToPrint = textToPrint.replace(/#/g, '').trim();
        doc.setFont("times", "bold");
        doc.setFontSize(14);
      } else if (textToPrint.startsWith('**') && textToPrint.endsWith('**')) {
         isHeading = true;
         textToPrint = textToPrint.replace(/\*\*/g, '').trim();
         doc.setFont("times", "bold");
         doc.setFontSize(12);
      } else {
         doc.setFont("times", "normal");
         doc.setFontSize(12);
         textToPrint = textToPrint.replace(/\*\*/g, '');
      }

      if (yPos > pageHeight - margin) {
        doc.addPage();
        pageNum++;
        addHeader();
        yPos = 40;
      }

      if (isHeading) {
         doc.text(textToPrint, margin, yPos);
         const split = doc.splitTextToSize(textToPrint, textWidth);
         yPos += split.length * lineSpacing;
      } else {
         // Indent 1.5cm (~15mm)
         const indentSpaces = "               "; 
         const textLines = doc.splitTextToSize(indentSpaces + textToPrint, textWidth);
         
         textLines.forEach((line: string, index: number) => {
             if (yPos > pageHeight - margin) {
                doc.addPage();
                pageNum++;
                addHeader();
                yPos = 40;
             }
             const isLastLine = index === textLines.length - 1;
             doc.text(line, margin, yPos, { maxWidth: textWidth, align: isLastLine ? 'left' : 'justify' });
             yPos += lineSpacing;
         });
      }
      yPos += 5; // space between paragraphs
    });

    doc.save(`Plano_de_Negocio_${projectData.name ? projectData.name.replace(/\s+/g, '_') : 'Projeto'}.pdf`);
  };

  const downloadSocialProject = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/generate-social-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const projectText = data.projectText || '';
      const pagesContent = projectText.split('[PAGE_BREAK]').map((p: string) => p.trim());
      
      const doc = new jsPDF({ format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginT = 20; // 2cm
      const marginR = 20; // 2cm
      const marginB = 30; // 3cm
      const marginL = 30; // 3cm
      const textWidth = pageWidth - marginL - marginR;
      
      // Page 1: Cover (Styled like the attached model header)
      doc.setFillColor(38, 38, 38); // Dark gray background for header
      doc.rect(0, 0, pageWidth, 130, 'F');
      
      // Logo (top center, small, watermark opacity)
      doc.setGState(new (doc as any).GState({opacity: 0.15}));
      const logoWidth = 40;
      const logoHeight = 40;
      doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);
      doc.setGState(new (doc as any).GState({opacity: 1.0}));
      
      // Yellow badge
      doc.setFillColor(234, 179, 8); // Tailwind yellow-500
      doc.rect(marginL, 40, 48, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("PROPOSTA DE PROJETO", marginL + 2, 45.2);
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      const titleLines = doc.splitTextToSize(projectData.name ? projectData.name.toUpperCase() : 'PROJETO SOCIAL', textWidth);
      doc.text(titleLines, marginL, 60);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(234, 179, 8); // Yellow
      doc.text(`Programa / Iniciativa: "${projectData.name || 'Projeto'}"`, marginL, 60 + (titleLines.length * 8) + 5);
      
      // Proponent info
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Proponente: ${projectData.investorName || 'Não Informado'} | Foco: ${projectData.targetAudience || 'Impacto Social'}`, marginL, 60 + (titleLines.length * 8) + 15, { maxWidth: textWidth });
      
      // Date at bottom center
      doc.setTextColor(100, 100, 100);
      const dateStr = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(11);
      doc.text(dateStr, pageWidth / 2, pageHeight - marginB, { align: 'center' });
      
      // Pages 2, 3, 4, 5
      for (let i = 0; i < 4; i++) {
        doc.addPage();
        const content = pagesContent[i] || '';
        const paragraphs = content.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        let yPos = marginT;
        const lineSpacing = 6;
        
        paragraphs.forEach((para: string) => {
          let textToPrint = para;
          let isHeading = false;
          let isBullet = textToPrint.startsWith('•') || textToPrint.startsWith('-');
          
          if (textToPrint === textToPrint.toUpperCase() && textToPrint.length > 5 && !isBullet) {
             isHeading = true;
          }
          
          if (yPos > pageHeight - marginB - 10) {
            doc.addPage();
            yPos = marginT;
          }
          
          if (isHeading) {
             yPos += 4; // Extra space before heading
             
             // Draw yellow vertical bar
             doc.setFillColor(234, 179, 8);
             doc.rect(marginL - 4, yPos - 4.5, 1.5, 5.5, 'F');
             
             doc.setFont("helvetica", "bold");
             doc.setFontSize(13);
             doc.setTextColor(0, 0, 0);
             const split = doc.splitTextToSize(textToPrint, textWidth);
             doc.text(split, marginL, yPos);
             yPos += split.length * lineSpacing;
             yPos += 2; // Extra space after heading
          } else {
             doc.setFont("helvetica", "normal");
             doc.setFontSize(11);
             doc.setTextColor(60, 60, 60);
             
             let currentMarginL = marginL;
             let currentTextWidth = textWidth;
             if (isBullet) {
                 currentMarginL = marginL + 5;
                 currentTextWidth = textWidth - 5;
             }
             
             const textLines = doc.splitTextToSize(textToPrint, currentTextWidth);
             textLines.forEach((line: string, index: number) => {
                 if (yPos > pageHeight - marginB) {
                    doc.addPage();
                    yPos = marginT;
                 }
                 const isLastLine = index === textLines.length - 1;
                 doc.text(line, currentMarginL, yPos, { maxWidth: currentTextWidth, align: (isLastLine || isBullet) ? 'left' : 'justify' });
                 yPos += lineSpacing;
             });
             yPos += 3; // space between paragraphs
          }
        });
        
        // Footer on all content pages
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Proposta de Projeto Social — ${projectData.name || 'Projeto'} | Página ${i + 2}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      }
      
      doc.save(`Projeto_Social_${projectData.name ? projectData.name.replace(/\s+/g, '_') : 'Projeto'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar projeto social:', error);
      alert('Ocorreu um erro ao gerar o documento do projeto. Tente novamente.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSuggestEstimates = async () => {
    setIsSuggestingEstimates(true);
    try {
      const response = await fetch('/api/suggest-estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData })
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      if (data.estimates) {
        setEstimates(prev => ({
          ...prev,
          ...data.estimates
        }));
      }
    } catch (error) {
      console.error('Error suggesting estimates:', error);
      alert('Ocorreu um erro ao sugerir as estimativas. Tente novamente.');
    } finally {
      setIsSuggestingEstimates(false);
    }
  };

  const downloadReport = async () => {
    if (!indicators) return;
    const { vpl, tir, paybackSimples, paybackDescontado, il, mv } = indicators;
    
    const doc = new jsPDF();
    const isDifferentCurrency = projectData.currency !== projectData.localCurrency;

    // Carregar logo para marca d'água
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; 
    });

    const addWatermark = () => {
      try {
        doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
        doc.addImage(img, 'JPEG', 160, 10, 35, 35);
        doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      } catch (e) {
        console.error(e);
      }
    };

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("BOM NEGÓCIO - RELATÓRIO DE VIABILIDADE", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 26);
    addWatermark();

    let yPos = 35;

    if (isDifferentCurrency) {
      doc.setFont("helvetica", "bold");
      doc.text("--- CÂMBIO APLICADO ---", 14, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 6;
      doc.text(`Taxa: 1 ${projectData.currency} = ${projectData.exchangeRate.toFixed(4)} ${projectData.localCurrency}`, 14, yPos);
      yPos += 10;
    }

    doc.setFont("helvetica", "bold");
    doc.text("--- DADOS DO PROJETO ---", 14, yPos);
    yPos += 4;
    
    const projectTableData = [
      ["Nome do Projeto", projectData.name || 'Não especificado'],
      ["Tipologia", projectData.type],
      ["Visão", projectData.vision || 'Não especificado'],
      ["Missão", projectData.mission || 'Não especificado'],
      ["Público-Alvo", projectData.targetAudience || 'Não especificado'],
      ["Investimento Inicial", `${formatCurrency(projectData.initialInvestment, projectData.currency)}${isDifferentCurrency ? ` (≈ ${formatCurrency(projectData.initialInvestment * projectData.exchangeRate, projectData.localCurrency)})` : ''}`],
      ["Forma de Angariação", projectData.fundingType],
      ["Tolerância a Perda (TMA)", `${projectData.lossTolerance}% a.a.`],
      ["Horizonte de Análise", `${projectData.horizon} Anos`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Campo', 'Informação']],
      body: projectTableData,
      theme: 'grid',
      headStyles: { fillColor: [4, 3, 75] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.text("--- FLUXO DE CAIXA PROJETADO ---", 14, yPos);
    
    const tableData = [
      ["Ano 0 (Investimento)", formatCurrency(-projectData.initialInvestment, projectData.currency)]
    ];
    cashFlow.forEach((cf, idx) => {
      tableData.push([`Ano ${idx + 1}`, formatCurrency(cf, projectData.currency)]);
    });
    tableData.push(["Total do Período", formatCurrency(cashFlow.reduce((a, b) => a + b, 0), projectData.currency)]);

    autoTable(doc, {
      startY: yPos + 4,
      head: [['Período', 'Valor Projetado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [4, 3, 75] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    if (yPos > 240) { doc.addPage(); yPos = 20; addWatermark(); }
    
    doc.setFont("helvetica", "bold");
    doc.text("--- INDICADORES FINANCEIROS ---", 14, yPos);
    yPos += 4;
    
    const vplLocal = isDifferentCurrency ? ` (≈ ${formatCurrency(vpl * projectData.exchangeRate, projectData.localCurrency)})` : '';
    
    const indicatorsTableData = [
      ["VPL (Valor Presente Líquido)", `${formatCurrency(vpl, projectData.currency)}${vplLocal}`, "É o valor atual do dinheiro que o projeto vai gerar no futuro, descontando a inflação e taxas. Se for maior que zero, o projeto gera lucro real."],
      ["TIR (Taxa Interna de Retorno)", isNaN(tir) ? 'N/A' : tir.toFixed(1) + '%', "É a rentabilidade percentual do projeto. Se for maior que a sua Taxa (TMA), significa que o projeto rende mais do que o mínimo exigido."],
      ["Payback Simples e Descontado", isNaN(paybackDescontado) || paybackDescontado === Infinity ? 'N/A' : paybackDescontado.toFixed(1) + ' Anos (Desc.)', "Tempo exato para recuperar o investimento inicial. O Descontado é mais preciso pois considera a perda do valor do dinheiro no tempo."],
      ["Índice de Lucratividade (IL)", isNaN(il) ? 'N/A' : formatCurrency(il, projectData.currency) + ' por 1', "Mostra quanto você ganha para cada moeda investida."],
      ["Média de Viabilização (MV)", isNaN(mv) ? 'N/A' : mv.toFixed(2), "Indicador composto. >= 1 indica que os indicadores superam as metas estabelecidas."]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Resultado', 'O que significa?']],
      body: indicatorsTableData,
      theme: 'grid',
      headStyles: { fillColor: [4, 3, 75] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 
         0: { fontStyle: 'bold', cellWidth: 45 },
         1: { fontStyle: 'bold', cellWidth: 45 },
         2: { cellWidth: 'auto' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    const chartsList = [
      { title: "Gráfico do VPL", id: "vpl-chart" },
      { title: "Gráfico da TIR", id: "tir-chart" },
      { title: "Gráfico do Payback", id: "payback-chart" },
      { title: "Gráfico do Índice de Lucratividade", id: "il-chart" }
    ];

    if (yPos > 240) { doc.addPage(); yPos = 20; addWatermark(); }
    doc.setFont("helvetica", "bold");
    doc.text("--- GRÁFICOS DE ANÁLISE ---", 14, yPos);
    yPos += 10;

    for (const chart of chartsList) {
       // Capturar o gráfico
       const el = document.getElementById(chart.id);
       if (el) {
          try {
            const imgData = await toPng(el, { backgroundColor: '#04034b', pixelRatio: 2 });
            const imgProps = doc.getImageProperties(imgData);
            const imgWidth = 140;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            if (yPos + imgHeight + 10 > 280) {
               doc.addPage();
               yPos = 20;
               addWatermark();
            }
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(chart.title, 14, yPos);
            yPos += 6;
            
            doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
          } catch (err) {
            console.error("Erro ao capturar gráfico", err);
          }
       }
    }

    if (yPos > 240) { doc.addPage(); yPos = 20; addWatermark(); }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("--- VEREDITO FINAL ---", 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const verdictColor = mv >= 1 ? [16, 185, 129] : [244, 63, 94]; // emerald-500 or rose-500
    doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
    doc.text(`VEREDITO: ${recommendation}`, 14, yPos, { maxWidth: 180, align: 'justify' });
    doc.setTextColor(0, 0, 0); // reset color
    
    yPos += 15;

    doc.setFont("helvetica", "bold");
    doc.text(`Viabilidade Geral: ${isNaN(mv) ? 'Indisponível' : mv >= 1 ? 'Alta (Recomendado seguir com a execução)' : 'Baixa (Atenção: Alto Risco)'}`, 14, yPos);
    doc.setFont("helvetica", "normal");
    
    yPos += 15;
    
    if (yPos > 240) { doc.addPage(); yPos = 20; addWatermark(); }
    doc.setFont("helvetica", "bold");
    doc.text("--- NOTA EXPLICATIVA ---", 14, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    const recText = recommendation ? recommendation : 'Nenhuma nota explicativa gerada para esta simulação.';
    const recLines = doc.splitTextToSize(recText, 180);
    
    if (yPos + (recLines.length * 5) > 280) { 
       doc.addPage(); 
       yPos = 20; 
       addWatermark();
    }
    
    doc.text(recText, 14, yPos, { maxWidth: 180, align: 'justify' });

    doc.save(`Relatorio_Viabilidade_${projectData.name ? projectData.name.replace(/\s+/g, '_') : 'Projeto'}.pdf`);
  };
return (
    <div 
      className={cn("min-h-screen font-sans transition-all duration-500", step === 1 ? "text-white" : "text-slate-900")}
      style={step === 1 ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.8)), url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundImage: `linear-gradient(rgba(4, 3, 75, 0.6), rgba(4, 3, 75, 0.8)), url(${bgImageInternal})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <header className={cn("border-b sticky top-0 z-10 transition-all duration-500", step === 1 ? "bg-slate-900/50 backdrop-blur-md border-slate-800/50" : "bg-[#04034b]/80 backdrop-blur-md border-[#140242]")}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className={cn("flex items-center space-x-2 text-white")}>
            <img src={logoImg} alt="Bom Negócio Logo" className="w-8 h-8 rounded-md" />
            <h1 className="text-xl font-bold tracking-tight">Bom Negócio</h1>
          </div>
          <div className={cn("flex items-center space-x-2 text-sm font-medium", step === 1 ? "text-slate-400" : "text-slate-400")}>
            <span className={cn(step >= 1 ? (step === 1 ? "text-amber-400" : "text-emerald-400") : "")}>1</span>
            <span className={step === 1 ? "text-slate-600" : "text-slate-600"}>-</span>
            <span className={cn(step >= 2 ? (step === 2 ? "text-amber-400" : "text-emerald-400") : "")}>2</span>
            <span className={step === 1 ? "text-slate-600" : "text-slate-600"}>-</span>
            <span className={cn(step >= 3 ? (step === 3 ? "text-amber-400" : "text-emerald-400") : "")}>3</span>
            <span className={step === 1 ? "text-slate-600" : "text-slate-600"}>-</span>
            <span className={cn(step >= 4 ? (step === 4 ? "text-amber-400" : "text-emerald-400") : "")}>4</span>
          </div>
        </div>
      </header>

      <main className={cn("mx-auto px-6 py-12", step === 1 ? "max-w-6xl" : "max-w-5xl")}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full min-h-[calc(100vh-160px)] flex flex-col md:flex-row items-center justify-between py-10"
            >
              {/* Left side text */}
              <div className="w-full md:w-1/2 pr-0 md:pr-12 mb-16 md:mb-0">
                <div className="inline-block px-4 py-2 bg-[#9129ce] rounded-full text-white text-sm font-bold mb-6">
                  Gratuito
                </div>
                <p className="text-emerald-400 font-bold mb-4 flex items-center uppercase tracking-wider text-sm">
                  <span className="w-6 h-[2px] bg-emerald-400 mr-3"></span>
                  Introduzindo
                </p>
                <h2 
                  className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight mb-4"
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    textAlign: 'left',
                  }}
                >
                  Valide e organize <br/>
                  sua ideia antes <br/>
                  de investir.
                </h2>
                <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
                  Testar a viabilidade de uma ideia previne falências e maximiza seus resultados. Descubra a probabilidade de sucesso do seu negócio com nossas simulações financeiras avançadas e organize o seu plano de negócio.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl shadow-amber-400/20"
                  >
                    Começar
                  </button>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="px-8 py-4 bg-transparent border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Info className="w-5 h-5 text-slate-400" />
                    Como funciona?
                  </button>
                </div>
              </div>

              {/* Right side circle image area */}
              <div className="w-full md:w-1/2 relative flex justify-center items-center">
                <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] rounded-full border-[20px] md:border-[30px] border-white bg-transparent relative flex items-center justify-center">
                  {/* Central Graphic */}
                  <motion.div
                    className="absolute -top-12 md:-top-20 left-1/2 w-[110%] h-[577.5px] -mt-[106px] z-0 rounded-[1000px] overflow-hidden shadow-2xl"
                    initial={{ x: "-50%", y: 0 }}
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  >
                    <img 
                      src={businessPersonImg} 
                      alt="Empreendedor" 
                      className="w-full h-full object-cover object-top bg-transparent" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent pointer-events-none"></div>
                  </motion.div>
                  
                  {/* Floating elements */}
                  <div className="absolute -left-8 md:-left-12 top-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-xl border border-slate-700">
                    <Calculator className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                  </div>
                  <div className="absolute top-4 left-10 md:top-8 md:left-14 w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-full flex items-center justify-center shadow-xl border border-slate-700">
                    <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                  </div>
                  <div className="absolute top-4 right-10 md:top-8 md:right-14 w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-full flex items-center justify-center shadow-xl border border-slate-700">
                    <Briefcase className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
                  </div>
                  <div className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-xl border border-slate-700">
                    <FileSpreadsheet className="w-8 h-8 md:w-10 md:h-10 text-rose-400" />
                  </div>
                  
                  <a
                    href="https://bom-neg-cio-1.ai.studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 md:bottom-8 md:right-6 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-900 font-extrabold px-6 py-3 md:px-8 md:py-3.5 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.5)] hover:scale-105 transition-all z-20 flex items-center border-2 border-yellow-200"
                  >
                    Versão original
                    <span className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] md:text-xs font-black tracking-wider px-2 py-0.5 rounded-full border-2 border-slate-900 shadow-sm">
                      VIP
                    </span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto bg-[#04034b] text-white p-8 rounded-2xl shadow-xl border border-[#140242]"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Briefcase className="w-6 h-6 mr-2 text-blue-400" />
                Dados do Projeto
              </h2>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Projeto</label>
                    <input
                      type="text"
                      value={projectData.name}
                      onChange={e => setProjectData({...projectData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Autor do Projeto</label>
                    <input
                      type="text"
                      value={projectData.authorName}
                      onChange={e => setProjectData({...projectData, authorName: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tipologia do Negócio</label>
                    <select
                      value={projectData.type}
                      onChange={e => setProjectData({...projectData, type: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option>Venda de produto específico</option>
                      <option>Venda de produtos diversos</option>
                      <option>Prestação de serviços</option>
                      <option>Start-up</option>
                      <option>Sem fim lucrativo</option>
                    </select>
                  </div>
                  {projectData.type === 'Venda de produto específico' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Produto Específico</label>
                      <input
                        type="text"
                        value={projectData.specificProductName}
                        onChange={e => setProjectData({...projectData, specificProductName: e.target.value})}
                        className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Localização</label>
                  <input
                    type="text"
                    value={projectData.location}
                    onChange={e => setProjectData({...projectData, location: e.target.value})}
                    className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Visão</label>
                    <textarea
                      value={projectData.vision}
                      onChange={e => setProjectData({...projectData, vision: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Missão</label>
                    <textarea
                      value={projectData.mission}
                      onChange={e => setProjectData({...projectData, mission: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      rows={3}
                    />
                  </div>
                </div>

                {projectData.type !== 'Sem fim lucrativo' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Moeda (Valores de Entrada)</label>
                        <select 
                          value={projectData.currency}
                          onChange={e => setProjectData({...projectData, currency: e.target.value})}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="BRL">BRL (R$)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="AOA">AOA (Kz)</option>
                          <option value="MZN">MZN (MT)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Sua Moeda (Conversão)</label>
                        <select 
                          value={projectData.localCurrency}
                          onChange={e => setProjectData({...projectData, localCurrency: e.target.value})}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="BRL">BRL (R$)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="AOA">AOA (Kz)</option>
                          <option value="MZN">MZN (MT)</option>
                        </select>
                      </div>
                    </div>

                    {projectData.currency !== projectData.localCurrency && (
                      <div className="flex items-center justify-between text-sm text-slate-400 bg-[#0a0763]/50 p-3 rounded-lg border border-[#140242]">
                        <div className="flex items-center">
                          <Activity className="w-4 h-4 mr-2 text-amber-400" />
                          <span className="mr-2">Câmbio Atual:</span>
                          {isFetchingRate ? (
                            <span className="animate-pulse">Atualizando...</span>
                          ) : (
                            <strong className="text-emerald-400">
                              1 {projectData.currency} = {projectData.exchangeRate.toFixed(4)} {projectData.localCurrency}
                            </strong>
                          )}
                        </div>
                        <button
                          onClick={handleRefreshExchangeRate}
                          disabled={isFetchingRate}
                          className="flex items-center gap-1 px-3 py-1 bg-[#140242] hover:bg-[#1a0352] text-white rounded-md transition-colors disabled:opacity-50"
                          title="Atualizar câmbio"
                        >
                          <RotateCcw className={cn("w-3 h-3", isFetchingRate && "animate-spin")} />
                          Atualizar
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Investimento Inicial</label>
                        <input
                          type="text"
                          value={projectData.initialInvestment ? formatCurrency(projectData.initialInvestment, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setProjectData({...projectData, initialInvestment: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Forma de Angariação</label>
                        <select
                          value={projectData.fundingType}
                          onChange={e => setProjectData({...projectData, fundingType: e.target.value})}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                          <option>Emprego</option>
                          <option>Negócio próprio</option>
                          <option>Ofertado</option>
                          <option>Ganhado como prêmio</option>
                          <option>Renda extra</option>
                          <option>Recuperado</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Investidor</label>
                        <input
                          type="text"
                          value={projectData.investorName || ''}
                          onChange={e => setProjectData({...projectData, investorName: e.target.value})}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Orçamento do Projeto</label>
                        <input
                          type="text"
                          value={projectData.projectBudget ? formatCurrency(projectData.projectBudget, 'BRL') : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setProjectData({...projectData, projectBudget: Number(rawValue) / 100, initialInvestment: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Qual é a dor social urgente que o projeto resolve?</label>
                      <textarea
                        value={projectData.socialPain || ''}
                        onChange={e => setProjectData({...projectData, socialPain: e.target.value})}
                        className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Ganhos do Investidor</label>
                        <textarea
                          value={projectData.investorGains || ''}
                          onChange={e => setProjectData({...projectData, investorGains: e.target.value})}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Como o projeto se manterá sustentável?</label>
                        <textarea
                          value={projectData.sustainability || ''}
                          onChange={e => setProjectData({...projectData, sustainability: e.target.value})}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          rows={2}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Público-Alvo Pretendido</label>
                  <div className="flex gap-2">
                    <select
                      value={
                        ["Crianças", "Jovens", "Adultos", "Idosos", "Classe baixa", "Classe média", "Classe alta", ""].includes(projectData.targetAudience)
                          ? projectData.targetAudience
                          : "Outros"
                      }
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "Outros") {
                          setProjectData({...projectData, targetAudience: 'Outro público'}); // Placeholder para "Outros"
                        } else {
                          setProjectData({...projectData, targetAudience: val});
                        }
                      }}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="" disabled>Selecione o público</option>
                      <option value="Crianças">Crianças</option>
                      <option value="Jovens">Jovens</option>
                      <option value="Adultos">Adultos</option>
                      <option value="Idosos">Idosos</option>
                      <option value="Classe baixa">Classe baixa</option>
                      <option value="Classe média">Classe média</option>
                      <option value="Classe alta">Classe alta</option>
                      <option value="Outros">Outros...</option>
                    </select>

                    {!["Crianças", "Jovens", "Adultos", "Idosos", "Classe baixa", "Classe média", "Classe alta", ""].includes(projectData.targetAudience) && (
                      <input
                        type="text"
                        value={projectData.targetAudience === 'Outro público' ? '' : projectData.targetAudience}
                        onChange={e => setProjectData({...projectData, targetAudience: e.target.value})}
                        placeholder="Especifique..."
                        className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectData.type !== 'Sem fim lucrativo' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Tolerância a Perda (%)</label>
                      <input
                        type="number"
                        value={projectData.lossTolerance}
                        onChange={e => setProjectData({...projectData, lossTolerance: Number(e.target.value)})}
                        className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                      <p className="text-xs text-slate-400 mt-2">
                        Taxa Mínima de Atratividade (TMA): <strong className="text-blue-400">{projectData.lossTolerance}% a.a.</strong>
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Horizonte de Análise (Anos)</label>
                    <input
                      type="number"
                      value={projectData.horizon}
                      onChange={e => setProjectData({...projectData, horizon: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    onClick={() => setStep(3)}
                    disabled={projectData.type === 'Sem fim lucrativo' ? (!projectData.projectBudget || !projectData.horizon) : (!projectData.initialInvestment || !projectData.horizon)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-[#0a0763] disabled:text-slate-500 text-white rounded-lg font-medium flex items-center transition-colors"
                  >
                    Avançar para Fluxo de Caixa
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="bg-[#04034b] text-white p-8 rounded-2xl shadow-xl border border-[#140242]">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center mb-4 md:mb-0">
                    <Calculator className="w-6 h-6 mr-2 text-blue-400" />
                    {projectData.type === 'Sem fim lucrativo' ? 'Projeção de Arrecadação' : 'Simulação de Fluxo de Caixa'}
                  </h2>
                  <button
                    onClick={handleSuggestEstimates}
                    disabled={isSuggestingEstimates}
                    className="flex items-center text-sm px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    title="A IA irá sugerir valores realistas baseados no seu mercado, público-alvo e investimento inicial"
                  >
                    {isSuggestingEstimates ? (
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isSuggestingEstimates ? 'Analisando Mercado...' : 'Dica de IA'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {projectData.type === 'Sem fim lucrativo' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Contribuição Mensal</label>
                        <input
                          type="text"
                          value={estimates.monthlyContribution ? formatCurrency(estimates.monthlyContribution, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setEstimates({...estimates, monthlyContribution: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Apoio Anual de Parceiros</label>
                        <input
                          type="text"
                          value={estimates.yearlyPartnerSupport ? formatCurrency(estimates.yearlyPartnerSupport, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setEstimates({...estimates, yearlyPartnerSupport: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Apoio do Estado (Anual)</label>
                        <input
                          type="text"
                          value={estimates.stateSupport ? formatCurrency(estimates.stateSupport, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setEstimates({...estimates, stateSupport: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Lucro Mínimo Mensal</label>
                        <input
                          type="text"
                          value={estimates.min ? formatCurrency(estimates.min, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setEstimates({...estimates, min: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Lucro Médio Mensal</label>
                        <input
                          type="text"
                          value={estimates.med ? formatCurrency(estimates.med, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setEstimates({...estimates, med: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Lucro Máximo Mensal</label>
                        <input
                          type="text"
                          value={estimates.max ? formatCurrency(estimates.max, projectData.currency) : ''}
                          onChange={e => {
                            const rawValue = e.target.value.replace(/\D/g, '');
                            setEstimates({...estimates, max: Number(rawValue) / 100});
                          }}
                          className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                          placeholder={formatCurrency(0, projectData.currency)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Perfil de Fluxo</label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setFlowProfile('Pessimista')}
                      className={cn(
                        "flex-1 py-3 px-4 border rounded-xl font-medium transition-all",
                        flowProfile === 'Pessimista' ? "bg-[#0a0763] border-blue-500 text-blue-400 shadow-sm" : "border-[#140242] hover:bg-[#0a0763] text-slate-400"
                      )}
                    >
                      Pessimista
                    </button>
                    <button
                      onClick={() => setFlowProfile('Otimista')}
                      className={cn(
                        "flex-1 py-3 px-4 border rounded-xl font-medium transition-all",
                        flowProfile === 'Otimista' ? "bg-[#0a0763] border-blue-500 text-blue-400 shadow-sm" : "border-[#140242] hover:bg-[#0a0763] text-slate-400"
                      )}
                    >
                      Otimista
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mb-8">
                  <button
                    onClick={generateCashFlow}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors border border-blue-500"
                  >
                    Gerar Tabela de Fluxo
                  </button>
                </div>

                {cashFlow.length > 0 && (
                  <div className="border border-[#140242] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-[#0a0763] text-slate-400 text-xs uppercase font-semibold">
                          <tr>
                            <th className="px-4 sm:px-6 py-4 border-b border-[#140242] whitespace-nowrap">Período</th>
                            <th className="px-4 sm:px-6 py-4 border-b border-[#140242] whitespace-nowrap">Estimativa Diária</th>
                            <th className="px-4 sm:px-6 py-4 border-b border-[#140242] text-right whitespace-nowrap">Fluxo Anual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#140242]">
                          <tr className="bg-[#0a0763]/50">
                            <td className="px-4 sm:px-6 py-4 font-medium text-white whitespace-nowrap">Ano 0 (Investimento)</td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">-</td>
                            <td className="px-4 sm:px-6 py-4 text-right text-rose-400 font-medium whitespace-nowrap">- {formatCurrency(projectData.initialInvestment, projectData.currency)}</td>
                          </tr>
                          {cashFlow.map((cf, idx) => (
                            <tr key={idx} className="hover:bg-[#0a0763] transition-colors">
                              <td className="px-4 sm:px-6 py-4 font-medium text-white whitespace-nowrap">Ano {idx + 1}</td>
                              <td className={cn("px-4 sm:px-6 py-4 whitespace-nowrap", cf < 0 ? "text-rose-400" : "")}>{formatCurrency(cf / 365, projectData.currency)}</td>
                              <td className={cn("px-4 sm:px-6 py-4 text-right font-medium whitespace-nowrap", cf < 0 ? "text-rose-400" : "text-emerald-400")}>{formatCurrency(cf, projectData.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-[#0a0763] font-bold text-white">
                          <tr>
                            <td colSpan={2} className="px-4 sm:px-6 py-4 border-t border-[#140242] whitespace-nowrap">Total no Período</td>
                            <td className={cn("px-4 sm:px-6 py-4 text-right border-t border-[#140242] whitespace-nowrap", cashFlow.reduce((a, b) => a + b, 0) < 0 ? "text-rose-400" : "text-emerald-400")}>
                              {formatCurrency(cashFlow.reduce((a, b) => a + b, 0), projectData.currency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {cashFlow.length > 0 && (
                  <div className="pt-8 flex justify-between">
                    <button
                      onClick={() => setCashFlow([])}
                      className="px-6 py-3 border border-[#140242] text-slate-300 hover:bg-[#0a0763] rounded-lg font-medium flex items-center transition-colors"
                    >
                      <RotateCcw className="mr-2 w-4 h-4" />
                      Refazer
                    </button>
                    <button
                      onClick={calculateFinancialIndicators}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors shadow-md hover:shadow-lg"
                    >
                      Aprovar Fluxo
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && indicators && (() => {
            // Preparar dados para os gráficos
            const cumulativeFlow = cashFlow.reduce((acc, curr, i) => {
              const prev = i === 0 ? -projectData.initialInvestment : acc[i-1];
              acc.push(prev + curr);
              return acc;
            }, [] as number[]);
            
            const vplChartData = [
              { ano: 'Ano 0', valor: -projectData.initialInvestment },
              ...cashFlow.map((cf, i) => ({ ano: `Ano ${i+1}`, valor: cumulativeFlow[i] }))
            ];
            
            const tirChartData = [
              { name: 'TMA', valor: projectData.lossTolerance, fill: '#64748b' },
              { name: 'TIR', valor: isNaN(indicators.tir) ? 0 : indicators.tir, fill: (isNaN(indicators.tir) || indicators.tir < projectData.lossTolerance) ? '#f43f5e' : '#10b981' }
            ];

            const paybackChartData = [
              { name: 'Simples', anos: isNaN(indicators.paybackSimples) || indicators.paybackSimples === Infinity ? 0 : Number(indicators.paybackSimples.toFixed(1)) },
              { name: 'Descontado', anos: isNaN(indicators.paybackDescontado) || indicators.paybackDescontado === Infinity ? 0 : Number(indicators.paybackDescontado.toFixed(1)) }
            ];

            return (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto w-full"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-none md:grid-rows-3 gap-4">
                
                {/* Sidebar: Project Overview */}
                <div className="md:col-span-1 md:row-span-2 bg-[#04034b] rounded-3xl p-6 border border-[#140242] shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Resumo do Projeto</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-400">Investimento Inicial (FC₀)</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(projectData.initialInvestment, projectData.currency)}</p>
                        {projectData.currency !== projectData.localCurrency && (
                           <p className="text-[10px] text-slate-500 font-medium">≈ {formatCurrency(projectData.initialInvestment * projectData.exchangeRate, projectData.localCurrency)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">TMA (Tolerância de Perda)</p>
                        <p className="text-lg font-semibold text-slate-300">{projectData.lossTolerance}% <span className="text-xs font-normal text-slate-500">a.a.</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Horizonte de Análise</p>
                        <p className="text-lg font-semibold text-slate-300">{projectData.horizon} Anos</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#140242] mt-6">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Público-Alvo</p>
                    <p className="text-sm text-slate-400 italic leading-relaxed">"{projectData.targetAudience || 'Não especificado'}"</p>
                  </div>
                </div>

                {/* Main Indicator: VPL */}
                <div 
                  className={cn(
                  "md:col-span-2 md:row-span-1 bg-[#04034b] rounded-3xl p-6 border-l-8 border-y border-r border-[#140242] shadow-xl flex flex-col justify-between",
                  indicators.vpl > 0 ? "border-l-emerald-500" : indicators.vpl === 0 ? "border-l-amber-500" : "border-l-rose-500"
                )}>
                  <div id="vpl-chart" className="w-full h-32 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={vplChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVpl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={indicators.vpl >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={indicators.vpl >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="ano" hide />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          formatter={(value: number) => [formatCurrency(value, projectData.currency), 'Acumulado']}
                        />
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="valor" stroke={indicators.vpl >= 0 ? "#10b981" : "#f43f5e"} fillOpacity={1} fill="url(#colorVpl)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase">Valor Presente Líquido (VPL)</h3>
                      <p className="text-4xl font-black text-white mt-2 flex items-baseline gap-2">
                        {formatCurrency(indicators.vpl, projectData.currency)}
                        {projectData.currency !== projectData.localCurrency && (
                          <span className="text-sm font-medium text-slate-500">≈ {formatCurrency(indicators.vpl * projectData.exchangeRate, projectData.localCurrency)}</span>
                        )}
                      </p>
                      <p className={cn(
                        "text-xs font-bold mt-1 uppercase",
                        indicators.vpl > 0 ? "text-emerald-400" : indicators.vpl === 0 ? "text-amber-400" : "text-rose-400"
                      )}>
                        ● {indicators.vpl > 0 ? 'Saldo Positivo Gerado' : indicators.vpl === 0 ? 'Ponto de Equilíbrio' : 'Prejuízo Estimado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metric: TIR */}
                <div 
                  className="md:col-span-1 md:row-span-1 bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden border border-slate-800">
                  <div id="tir-chart" className="w-full h-32 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tirChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <RechartsTooltip 
                          cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa']}
                        />
                        <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {tirChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="z-10">
                    <h3 className="text-xs font-bold text-slate-400 uppercase">TIR (Taxa de Retorno)</h3>
                    <p className="text-3xl font-bold mt-1">{isNaN(indicators.tir) ? 'N/A' : `${indicators.tir.toFixed(1)}%`}</p>
                    <p className={cn(
                      "text-xs font-medium mt-1",
                      isNaN(indicators.tir) ? "text-slate-500" : indicators.tir > projectData.lossTolerance ? "text-emerald-400" : indicators.tir === projectData.lossTolerance ? "text-amber-400" : "text-rose-400"
                    )}>
                      {isNaN(indicators.tir) 
                        ? 'Sem retorno projetado' 
                        : indicators.tir > projectData.lossTolerance 
                          ? `+${(indicators.tir - projectData.lossTolerance).toFixed(1)}% acima da TMA` 
                          : indicators.tir === projectData.lossTolerance 
                            ? 'Igual à TMA' 
                            : `${(indicators.tir - projectData.lossTolerance).toFixed(1)}% abaixo da TMA`}
                    </p>
                  </div>
                </div>

                {/* Payback Section */}
                <div 
                  className="md:col-span-2 md:row-span-1 bg-[#04034b] rounded-3xl p-6 border border-[#140242] shadow-xl flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase">Recuperação de Capital (Payback)</h3>
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded uppercase",
                      isNaN(indicators.paybackDescontado) || indicators.paybackDescontado > projectData.horizon ? "bg-rose-900/40 text-rose-400" : "bg-emerald-900/40 text-emerald-400"
                    )}>
                      {isNaN(indicators.paybackDescontado) || indicators.paybackDescontado > projectData.horizon ? 'Fora do Prazo' : 'Dentro do Prazo'}
                    </span>
                  </div>
                  
                  <div id="payback-chart" className="flex-1 w-full h-24 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paybackChartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          formatter={(value: number) => [`${value} Anos`, 'Tempo']}
                        />
                        <ReferenceLine x={projectData.horizon} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'top', value: 'Prazo', fill: '#f43f5e', fontSize: 10 }} />
                        <Bar dataKey="anos" radius={[0, 4, 4, 0]} maxBarSize={20}>
                          {paybackChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#8b5cf6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0a0763] border border-[#140242] rounded-2xl">
                      <p className="text-[10px] text-slate-400 uppercase">Simples</p>
                      <p className="text-xl font-bold text-white">{isNaN(indicators.paybackSimples) || indicators.paybackSimples === Infinity ? 'N/A' : `${indicators.paybackSimples.toFixed(1)} Anos`}</p>
                    </div>
                    <div className="p-4 bg-[#0a0763] border border-[#140242] rounded-2xl">
                      <p className="text-[10px] text-slate-400 uppercase">Descontado</p>
                      <p className="text-xl font-bold text-white">{isNaN(indicators.paybackDescontado) || indicators.paybackDescontado === Infinity ? 'N/A' : `${indicators.paybackDescontado.toFixed(1)} Anos`}</p>
                    </div>
                  </div>
                </div>

                {/* Index: IL */}
                <div 
                  className="md:col-span-1 md:row-span-1 bg-[#04034b] rounded-3xl p-6 border border-[#140242] shadow-xl flex flex-col justify-center items-center text-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Índice de Lucratividade</h3>
                  <div id="il-chart" className="w-full h-32 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" cy="50%" 
                        innerRadius="70%" outerRadius="100%" 
                        barSize={15} 
                        data={[{ name: 'IL', value: isNaN(indicators.il) ? 0 : indicators.il, fill: isNaN(indicators.il) ? '#64748b' : indicators.il > 1 ? '#10b981' : indicators.il === 1 ? '#f59e0b' : '#f43f5e' }]}
                        startAngle={180} endAngle={0}
                      >
                        <PolarAngleAxis type="number" domain={[0, Math.max(2, isNaN(indicators.il) ? 2 : indicators.il)]} angleAxisId={0} tick={false} />
                        <RadialBar clockWise dataKey="value" cornerRadius={10} background={{ fill: '#0a0763' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
                      <span className="text-2xl font-black text-white">{isNaN(indicators.il) ? 'N/A' : indicators.il.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase">{isNaN(indicators.il) ? 'Indisponível' : `${formatCurrency(indicators.il, projectData.currency)} para cada ${formatCurrency(1, projectData.currency)} investido`}</p>
                </div>

                {/* Final Verdict: Média de Viabilização */}
                <div 
                  className={cn(
                  "md:col-span-4 md:row-span-1 rounded-3xl p-8 text-white flex flex-col lg:flex-row items-center justify-between shadow-2xl relative overflow-hidden",
                  isNaN(indicators.mv) ? "bg-slate-800" : indicators.mv >= 1 ? "bg-emerald-600" : "bg-rose-600"
                )}>
                  <div className="z-10 flex flex-col md:flex-row items-center gap-8 lg:max-w-[70%] w-full">
                    <div className="text-center md:text-left shrink-0">
                      <p className="text-white/80 text-xs font-bold uppercase mb-1">Status Geral</p>
                      <div className={cn(
                        "bg-white px-6 py-2 rounded-full font-black text-xl",
                        isNaN(indicators.mv) ? "text-slate-700" : indicators.mv >= 1 ? "text-emerald-700" : "text-rose-700"
                      )}>
                        {indicators.mv >= 1 ? "VIÁVEL / APROVADO" : "INVIÁVEL / REPROVADO"}
                      </div>
                    </div>
                    <div className="w-full">
                      <h2 className="text-2xl font-bold mb-2">Média de Viabilização (MV): {isNaN(indicators.mv) ? 'N/A' : indicators.mv.toFixed(2)}</h2>
                      {loadingRecommendation ? (
                        <div className="animate-pulse space-y-2 w-full mt-2">
                          <div className="h-2 bg-white/30 rounded w-full"></div>
                          <div className="h-2 bg-white/30 rounded w-5/6"></div>
                          <div className="h-2 bg-white/30 rounded w-4/6"></div>
                        </div>
                      ) : (
                        <p className="text-white/90 text-sm leading-relaxed">
                          {recommendation || (indicators.mv >= 1 
                            ? "Parabéns! O projeto apresenta excelentes indicadores. Recomendamos seguir com a execução." 
                            : "Atenção: Os indicadores financeiros demonstram que o projeto possui alto risco e não atinge a viabilidade esperada. Sugerimos revisar os custos ou premissas de receita.")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="z-10 mt-6 lg:mt-0 flex flex-col gap-3 shrink-0 w-full md:w-auto">
                    {marketQuestions.length > 0 ? (
                      <button
                        onClick={() => setShowQuestionsModal(true)}
                        className={cn(
                          "px-6 py-3 font-bold rounded-2xl shadow-lg transition-colors flex items-center justify-center",
                          indicators.mv >= 1 ? "bg-white text-emerald-700 hover:bg-emerald-50" : "bg-white text-rose-700 hover:bg-rose-50"
                        )}
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        Ver Questionário
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateForm}
                        disabled={isGeneratingForm}
                        className={cn(
                          "px-6 py-3 font-bold rounded-2xl shadow-lg transition-colors flex items-center justify-center disabled:opacity-70",
                          indicators.mv >= 1 ? "bg-white text-emerald-700 hover:bg-emerald-50" : "bg-white text-rose-700 hover:bg-rose-50"
                        )}
                      >
                        {isGeneratingForm ? 'Gerando...' : (
                          <><FileSpreadsheet className="w-5 h-5 mr-2" /> Gerar Pesquisa</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setStep(1);
                        setProjectData(INITIAL_PROJECT_DATA);
                        setEstimates(INITIAL_ESTIMATES);
                        setCashFlow([]);
                        setIndicators(null);
                        setRecommendation('');
                      }}
                      className="px-6 py-3 bg-black/20 text-white font-bold rounded-2xl shadow-lg hover:bg-black/30 transition-colors"
                    >
                      Novo Teste
                    </button>
                    {projectData.type === 'Sem fim lucrativo' ? (
                      <button
                        onClick={downloadSocialProject}
                        className="px-6 py-3 bg-purple-600/80 text-white font-bold rounded-2xl shadow-lg hover:bg-purple-600 transition-colors flex items-center justify-center"
                      >
                        {isGeneratingReport ? <RotateCcw className="w-5 h-5 mr-2 animate-spin" /> : <FileText className="w-5 h-5 mr-2" />} 
                        {isGeneratingReport ? 'Gerando...' : 'Construir Projeto Social'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPlanModal(true)}
                        className="px-6 py-3 bg-purple-600/80 text-white font-bold rounded-2xl shadow-lg hover:bg-purple-600 transition-colors flex items-center justify-center"
                      >
                        <FileText className="w-5 h-5 mr-2" /> Construir Plano de Negócio
                      </button>
                    )}
                    <button
                      onClick={downloadReport}
                      className="px-6 py-3 bg-blue-600/80 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                    >
                      <Download className="w-5 h-5 mr-2" /> Baixar Resumo
                    </button>
                  </div>
                  {/* Background Decorative Element */}
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white opacity-5 rounded-full"></div>
                </div>

              </div>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </main>
      {/* Questions Modal */}
      <AnimatePresence>
        {showQuestionsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#04034b] border border-[#140242] rounded-3xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-400" />
                  Pesquisa de Mercado
                </h2>
                <button onClick={() => setShowQuestionsModal(false)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4 text-slate-300 text-sm">
                Abaixo está a pré-visualização do seu formulário. Copie as perguntas formatadas e utilize-as na sua plataforma preferida (Google Forms, Typeform, WhatsApp, etc.) para validar a sua ideia com o público-alvo: <strong className="text-white">{projectData.targetAudience}</strong>
              </div>
              <div className="space-y-6 mb-6">
                {marketQuestions.map((q, idx) => (
                  <div key={idx} className="bg-[#0a0763] p-6 rounded-xl border border-[#140242]">
                    <p className="text-white text-base font-bold mb-4">{idx + 1}. {q.title}</p>
                    
                    {q.type === 'radio' && q.options && (
                      <div className="space-y-3">
                        {q.options.map((opt, i) => (
                          <label key={i} className="flex items-center space-x-3 text-slate-300">
                            <input type="radio" name={`question-${idx}`} className="form-radio h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900" />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'checkbox' && q.options && (
                      <div className="space-y-3">
                        {q.options.map((opt, i) => (
                          <label key={i} className="flex items-center space-x-3 text-slate-300">
                            <input type="checkbox" className="form-checkbox h-4 w-4 rounded text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-offset-slate-900" />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {(q.type === 'text') && (
                      <input type="text" placeholder="Sua resposta..." className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                    )}

                    {(q.type === 'textarea') && (
                      <textarea rows={3} placeholder="Sua resposta detalhada..." className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"></textarea>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8 border-t border-[#140242] pt-6">
                <div className="flex flex-col">
                  <a href="https://forms.google.com" target="_blank" rel="noreferrer" className="flex items-center text-blue-400 hover:text-blue-300 font-bold mb-1 transition-colors">
                    <ExternalLink className="w-4 h-4 mr-2" /> Abrir Google Forms
                  </a>
                  <p className="text-xs text-slate-400 max-w-xs">Copie as perguntas e cole no Google Form para poderes partilhar de forma fácil.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => {
                    const text = marketQuestions.map((q, i) => {
                      let str = `${i + 1}. ${q.title}`;
                      if (q.options && q.options.length > 0) {
                        str += '\n' + q.options.map(opt => `  - [ ] ${opt}`).join('\n');
                      } else {
                        str += '\n  ________________________________________';
                      }
                      return str;
                    }).join('\n\n');
                    const message = `Pesquisa de Mercado - ${projectData.name}\n\n${text}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="px-6 py-3 bg-emerald-600/90 text-white font-bold rounded-2xl shadow-lg hover:bg-emerald-600 transition-colors flex items-center"
                >
                  <MessageCircle className="w-5 h-5 mr-2" /> Partilhar no WhatsApp
                </button>
                <button
                  onClick={() => {
                    const text = marketQuestions.map((q, i) => {
                      let str = `${i + 1}. ${q.title}`;
                      if (q.options && q.options.length > 0) {
                        str += '\n' + q.options.map(opt => `  - [ ] ${opt}`).join('\n');
                      } else {
                        str += '\n  ________________________________________';
                      }
                      return str;
                    }).join('\n\n');
                    navigator.clipboard.writeText(`Pesquisa de Mercado - ${projectData.name}\n\n${text}`);
                    alert('Perguntas copiadas para a área de transferência!');
                  }}
                  className="px-6 py-3 bg-blue-600/80 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-600 transition-colors flex items-center"
                >
                  <FileText className="w-5 h-5 mr-2" /> Copiar Perguntas
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Business Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#04034b] border border-[#140242] text-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-[#140242] bg-slate-900/20 shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-purple-400" />
                  Construir Plano de Negócio (IA)
                </h3>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                {!generatedPlan ? (
                  <div className="space-y-6">
                    <p className="text-slate-300">Selecione o modelo de plano de negócio que melhor se adequa ao seu momento:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PLAN_TYPES.map((type, i) => (
                        <div 
                          key={i}
                          onClick={() => setPlanType(type.title)}
                          className={cn(
                            "p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5",
                            planType === type.title ? "border-purple-500 bg-purple-500/10" : "border-slate-700 bg-slate-800/50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-white">{type.title}</h4>
                            {planType === type.title && <CheckCircle className="w-5 h-5 text-purple-400" />}
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{type.desc}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                      <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2"><Info className="w-4 h-4"/> Pilares Fundamentais</h4>
                      <p className="text-sm text-slate-300">
                        Independente do modelo escolhido, a IA irá cobrir: Proposta de Valor, Análise de Mercado, Estratégia de Marketing, Viabilidade Financeira (usando os dados da sua simulação) e Capacidade Operacional.
                      </p>
                    </div>

                    <button
                      onClick={generateBusinessPlan}
                      disabled={isGeneratingPlan}
                      className="w-full py-4 mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                      {isGeneratingPlan ? (
                        <><RotateCcw className="w-5 h-5 animate-spin" /> Elaborando Plano (Isso pode levar 1-2 minutos)...</>
                      ) : (
                        <><FileText className="w-5 h-5" /> Gerar Plano com IA</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" /> Plano Gerado com Sucesso!
                      </h4>
                      <button
                        onClick={downloadBusinessPlanPDF}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Baixar PDF (APA)
                      </button>
                    </div>
                    
                    <div className="bg-slate-100 text-slate-900 p-6 rounded-xl overflow-y-auto max-h-[50vh] whitespace-pre-wrap font-serif text-sm shadow-inner">
                      {generatedPlan}
                    </div>

                    <button
                      onClick={() => setGeneratedPlan(null)}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                    >
                      Voltar aos Modelos
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              setShowHelpModal(false);
              setHelpSlideStep(1);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#04034b] border border-[#140242] text-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-[#140242] bg-slate-900/20">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Info className="w-6 h-6 text-blue-400" />
                  Como usar o Bom Negócio
                </h3>
                <button
                  onClick={() => {
                    setShowHelpModal(false);
                    setHelpSlideStep(1);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 relative min-h-[250px] flex items-center">
                <AnimatePresence mode="wait">
                  {helpSlideStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full text-center space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2 text-blue-400">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-bold text-white">1. Dados do Projeto</h4>
                      <p className="text-slate-300 leading-relaxed">
                        No primeiro passo, você irá preencher os dados básicos da sua ideia: nome, tipo de negócio, missão, público-alvo e o valor que você planeja investir para começar (Investimento Inicial).
                      </p>
                    </motion.div>
                  )}
                  {helpSlideStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full text-center space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2 text-amber-400">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-bold text-white">2. Pesquisa de Mercado</h4>
                      <p className="text-slate-300 leading-relaxed">
                        É hora de entender o seu mercado! Você poderá gerar um questionário automático (via inteligência artificial) baseado no seu projeto, criando um formulário Google pronto para ser enviado ao seu público.
                      </p>
                    </motion.div>
                  )}
                  {helpSlideStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full text-center space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                        <Calculator className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-bold text-white">3. Estimativa e Fluxo</h4>
                      <p className="text-slate-300 leading-relaxed">
                        Após validar a ideia no mercado, insira estimativas de lucro mensal (mínimo, médio e máximo). Escolha o perfil da sua projeção para ver o Fluxo de Caixa automático ganhar vida ano após ano.
                      </p>
                    </motion.div>
                  )}
                  {helpSlideStep === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full text-center space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2 text-purple-400">
                        <Activity className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-bold text-white">4. Viabilidade Financeira</h4>
                      <p className="text-slate-300 leading-relaxed">
                        A etapa de ouro. Veja todos os indicadores de sucesso (VPL, TIR, Payback) calculados. O sistema dará um Veredito Final claro se você deve seguir com o investimento ou abortar por alto risco!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 border-t border-[#140242] bg-slate-900/40 flex items-center justify-between">
                <button
                  onClick={() => setHelpSlideStep(prev => Math.max(1, prev - 1))}
                  disabled={helpSlideStep === 1}
                  className={cn("px-4 py-2 flex items-center font-medium rounded-lg transition-colors", helpSlideStep === 1 ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:bg-slate-800 hover:text-white")}
                >
                  <ChevronLeft className="w-5 h-5 mr-1" /> Anterior
                </button>
                
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map(dot => (
                    <div 
                      key={dot} 
                      className={cn("w-2 h-2 rounded-full transition-all", helpSlideStep === dot ? "bg-blue-500 w-4" : "bg-slate-700")}
                    />
                  ))}
                </div>

                {helpSlideStep < 4 ? (
                  <button
                    onClick={() => setHelpSlideStep(prev => Math.min(4, prev + 1))}
                    className="px-4 py-2 flex items-center font-medium text-white bg-blue-600/80 hover:bg-blue-500 rounded-lg transition-colors"
                  >
                    Próximo <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowHelpModal(false);
                      setHelpSlideStep(1);
                    }}
                    className="px-4 py-2 font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    Entendi!
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IndicatorCard({ title, value, status }: { title: string, value: string, status: 'green' | 'yellow' | 'red' }) {
  const statusColors = {
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700"
  };

  const statusBorder = {
    green: "border-l-4 border-l-green-500",
    yellow: "border-l-4 border-l-amber-500",
    red: "border-l-4 border-l-red-500"
  };

  return (
    <div className={cn("p-5 rounded-lg border shadow-sm flex flex-col justify-between", statusColors[status], statusBorder[status])}>
      <span className="text-sm font-semibold uppercase tracking-wider mb-2 opacity-80">{title}</span>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
}
