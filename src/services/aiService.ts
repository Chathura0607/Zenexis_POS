import { Product, Sale, RepairJob } from '../types';

export interface RestockPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  dailyVelocity: number;
  estimatedDaysLeft: number;
  recommendedOrderQty: number;
  urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  reason: string;
}

export function generateSmartRestockPredictions(products: Product[], sales: Sale[]): RestockPrediction[] {
  // Analyze last 30 days of sales
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSales = sales.filter(s => new Date(s.timestamp) >= thirtyDaysAgo && s.status === 'Completed');

  const salesByProduct: Record<string, number> = {};
  recentSales.forEach(sale => {
    sale.items.forEach(item => {
      salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + item.qty;
    });
  });

  return products
    .filter(p => !p.isService)
    .map(product => {
      const unitsSold = salesByProduct[product.id] || 0;
      const dailyVelocity = unitsSold / 30; // units per day
      const currentStock = product.stockQty || 0;
      const minStock = product.minStockLevel || 5;

      let estimatedDaysLeft = 999;
      if (dailyVelocity > 0) {
        estimatedDaysLeft = Math.floor(currentStock / dailyVelocity);
      } else if (currentStock === 0) {
        estimatedDaysLeft = 0;
      }

      let urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
      let recommendedOrderQty = 0;
      let reason = 'Stock is within healthy limits.';

      if (currentStock <= 0) {
        urgency = 'CRITICAL';
        recommendedOrderQty = Math.max(minStock * 2, Math.ceil(dailyVelocity * 14) || minStock);
        reason = `Out of stock! Recommended order: ${recommendedOrderQty} units immediately.`;
      } else if (currentStock <= minStock || estimatedDaysLeft <= 5) {
        urgency = 'WARNING';
        recommendedOrderQty = Math.max(minStock * 2, Math.ceil(dailyVelocity * 14));
        reason = `Stock running low (${currentStock} left). Will run out in ~${estimatedDaysLeft} days.`;
      }

      return {
        productId: product.id,
        productName: product.name,
        currentStock,
        minStock,
        dailyVelocity: parseFloat(dailyVelocity.toFixed(2)),
        estimatedDaysLeft,
        recommendedOrderQty,
        urgency,
        reason,
      };
    })
    .sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, HEALTHY: 2 };
      return order[a.urgency] - order[b.urgency];
    });
}

export function generateRepairEstimate(deviceType: string, faultDescription: string): {
  suggestedMinCost: number;
  suggestedMaxCost: number;
  estimatedHours: number;
  insights: string[];
} {
  const fault = faultDescription.toLowerCase();
  let min = 1500;
  let max = 3500;
  let hours = 2;
  const insights: string[] = [];

  if (deviceType.includes('mobile') || deviceType.includes('phone')) {
    if (fault.includes('display') || fault.includes('screen') || fault.includes('touch')) {
      min = 4500;
      max = 12500;
      hours = 3;
      insights.push('Display replacement required (OLED / Incell). Check frame alignment.');
    } else if (fault.includes('battery') || fault.includes('drain')) {
      min = 2500;
      max = 4500;
      hours = 1;
      insights.push('Battery degradation. Verify charging IC current draw.');
    } else if (fault.includes('charge') || fault.includes('port') || fault.includes('pin')) {
      min = 1200;
      max = 2800;
      hours = 1;
      insights.push('Charging ribbon or sub-board replacement recommended.');
    } else if (fault.includes('water') || fault.includes('drop')) {
      min = 3000;
      max = 8000;
      hours = 24;
      insights.push('Ultrasonic board wash & short circuit diagnostics required.');
    }
  } else if (deviceType.includes('pc') || deviceType.includes('laptop')) {
    if (fault.includes('windows') || fault.includes('format') || fault.includes('slow')) {
      min = 1500;
      max = 2500;
      hours = 2;
      insights.push('OS Reinstallation + driver package + essential software setup.');
    } else if (fault.includes('ssd') || fault.includes('hard') || fault.includes('storage')) {
      min = 6500;
      max = 14500;
      hours = 2;
      insights.push('NVMe / SATA SSD Upgrade + Data backup.');
    } else if (fault.includes('display') || fault.includes('hinge')) {
      min = 8500;
      max = 22000;
      hours = 4;
      insights.push('Screen panel replacement or hinge fabrication.');
    }
  } else if (deviceType.includes('mug')) {
    min = 850;
    max = 1200;
    hours = 1;
    insights.push('High-resolution sublimation print with heat press.');
  } else if (deviceType.includes('seal')) {
    min = 1500;
    max = 2800;
    hours = 2;
    insights.push('Flash foam exposure & oil-ink pre-soak.');
  }

  return {
    suggestedMinCost: min,
    suggestedMaxCost: max,
    estimatedHours: hours,
    insights,
  };
}

export function generateDailyExecutiveSummary(sales: Sale[], repairs: RepairJob[], expenses: number): {
  headline: string;
  bulletPoints: string[];
  healthScore: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => s.timestamp.startsWith(today) && s.status === 'Completed');
  const revenue = todaySales.reduce((sum, s) => sum + s.netTotal, 0);
  const profit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const todayRepairs = repairs.filter(r => r.receivedDate.startsWith(today));
  const readyRepairs = repairs.filter(r => r.status === 'Ready');

  const bullets: string[] = [
    `Generated Rs. ${revenue.toLocaleString()} across ${todaySales.length} customer invoices today.`,
    `Gross profit stood at Rs. ${profit.toLocaleString()} (${margin.toFixed(1)}% profit margin).`,
  ];

  if (todayRepairs.length > 0) {
    bullets.push(`Received ${todayRepairs.length} new custom/repair job tickets today.`);
  }

  if (readyRepairs.length > 0) {
    bullets.push(`${readyRepairs.length} finished repair/print jobs are awaiting customer collection.`);
  }

  if (expenses > 0) {
    bullets.push(`Total shop expenses logged today: Rs. ${expenses.toLocaleString()}`);
  }

  let healthScore = 85;
  if (revenue > 30000) healthScore += 10;
  if (margin > 30) healthScore += 5;

  return {
    headline: revenue > 0 
      ? `Today Zenexis reached Rs. ${revenue.toLocaleString()} in sales with a strong ${margin.toFixed(1)}% margin.`
      : 'Ready for today\'s transactions at Zenexis.',
    bulletPoints: bullets,
    healthScore: Math.min(100, healthScore),
  };
}
