export function calculateNPV(rate: number, initialInvestment: number, cashFlows: number[]): number {
  let npv = -initialInvestment;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t + 1);
  }
  return npv;
}

export function calculateIRR(initialInvestment: number, cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 1000;
  const tolerance = 1e-6;
  let rate = guess;
  
  // Quick check: if all cash flows are negative (or 0), IRR doesn't exist mathematically
  const totalInflows = cashFlows.reduce((sum, cf) => sum + (cf > 0 ? cf : 0), 0);
  if (totalInflows <= initialInvestment && initialInvestment > 0) {
    return NaN; // Or we could say it never pays off
  }

  for (let i = 0; i < maxIterations; i++) {
    let npv = -initialInvestment;
    let npvDerivative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denominator = Math.pow(1 + rate, t + 1);
      npv += cashFlows[t] / denominator;
      npvDerivative -= ((t + 1) * cashFlows[t]) / Math.pow(1 + rate, t + 2);
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    const newRate = rate - npv / npvDerivative;
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    rate = newRate;
  }
  return NaN; // Return NaN if it doesn't converge
}

export function calculatePaybackSimples(initialInvestment: number, cashFlows: number[]): number {
  let cumulative = -initialInvestment;
  for (let t = 0; t < cashFlows.length; t++) {
    const previousCumulative = cumulative;
    cumulative += cashFlows[t];
    if (cumulative >= 0) {
      // Linear interpolation for exact fraction of year
      return t + Math.abs(previousCumulative) / cashFlows[t];
    }
  }
  return Infinity;
}

export function calculatePaybackDescontado(rate: number, initialInvestment: number, cashFlows: number[]): number {
  let cumulative = -initialInvestment;
  for (let t = 0; t < cashFlows.length; t++) {
    const previousCumulative = cumulative;
    const discountedCF = cashFlows[t] / Math.pow(1 + rate, t + 1);
    cumulative += discountedCF;
    if (cumulative >= 0) {
      return t + Math.abs(previousCumulative) / discountedCF;
    }
  }
  return Infinity;
}

export function calculateIL(rate: number, initialInvestment: number, cashFlows: number[]): number {
  if (initialInvestment === 0) return 0;
  let sumDiscountedCF = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    sumDiscountedCF += cashFlows[t] / Math.pow(1 + rate, t + 1);
  }
  return sumDiscountedCF / initialInvestment;
}

export function calculateMV(tir: number, tma: number, il: number, vpl: number, fc0: number, n: number, paybackDesc: number): number {
  if (tma === 0 || fc0 === 0 || paybackDesc === 0 || paybackDesc === Infinity || isNaN(tir) || isNaN(paybackDesc)) return 0;
  return (tir / tma) * (il + vpl / fc0) * (n / paybackDesc);
}
