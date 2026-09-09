import { jsPDF } from "jspdf";
const doc = new jsPDF();
const g = new (doc as any).GState({opacity: 0.3});
