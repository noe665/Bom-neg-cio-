import * as icons from 'lucide-react';
const names = ['Briefcase', 'Activity', 'TrendingUp', 'Calculator', 'ArrowRight', 'ArrowLeft', 'RotateCcw', 'CheckCircle', 'XCircle', 'FileSpreadsheet', 'ExternalLink', 'Download', 'Info', 'ChevronRight', 'ChevronLeft', 'FileText', 'MessageCircle', 'Sparkles'];
for (const name of names) {
  if (!icons[name]) {
    console.log("MISSING:", name);
  }
}
console.log("Done checking icons.");
