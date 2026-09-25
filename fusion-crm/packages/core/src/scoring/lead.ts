export interface LeadScoringParams {
  channel: string;
  messageKeywords: string[];
  purchaseHistoryCount: number;
  responseTimeMinutes?: number;
  pipelineStage?: string;
}

export interface LeadScoreResult {
  score: number; // 0 to 100
  explanation: string;
}

/**
 * Calculates the lead score based on multiple factors.
 * Used for prioritizing conversations in the inbox.
 */
export function calculateLeadScore(params: LeadScoringParams): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Channel
  const highIntentChannels = ['WHATSAPP', 'WEB_WIDGET'];
  if (highIntentChannels.includes(params.channel.toUpperCase())) {
    score += 20;
    reasons.push(`Canal de alta intención (+20)`);
  } else {
    score += 10;
    reasons.push(`Canal estándar (+10)`);
  }

  // 2. Keywords
  const urgentKeywords = ['comprar', 'cotizar', 'urgente', 'precio', 'necesito', 'pagar', 'pedido'];
  const matchedKeywords = params.messageKeywords.filter(k => urgentKeywords.includes(k.toLowerCase()));
  if (matchedKeywords.length > 0) {
    const keywordPoints = Math.min(matchedKeywords.length * 10, 30);
    score += keywordPoints;
    reasons.push(`Palabras clave comerciales [${matchedKeywords.join(', ')}] (+${keywordPoints})`);
  }

  // 3. Purchase History
  if (params.purchaseHistoryCount > 0) {
    const historyPoints = Math.min(params.purchaseHistoryCount * 5, 25);
    score += historyPoints;
    reasons.push(`Cliente recurrente (${params.purchaseHistoryCount} compras) (+${historyPoints})`);
  }

  // 4. Response Time (Fast responses from the client indicate higher engagement)
  if (params.responseTimeMinutes !== undefined) {
    if (params.responseTimeMinutes < 15) {
      score += 15;
      reasons.push(`Respuesta rápida del cliente (<15m) (+15)`);
    } else if (params.responseTimeMinutes < 60) {
      score += 5;
      reasons.push(`Respuesta moderada del cliente (<1h) (+5)`);
    }
  }

  // 5. Pipeline Stage
  if (params.pipelineStage) {
    if (params.pipelineStage === 'NEGOTIATION') {
      score += 20;
      reasons.push(`Oportunidad en negociación (+20)`);
    } else if (params.pipelineStage === 'QUALIFICATION') {
      score += 10;
      reasons.push(`Oportunidad en calificación (+10)`);
    }
  }

  // Cap score at 100
  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    explanation: reasons.join(', ')
  };
}
