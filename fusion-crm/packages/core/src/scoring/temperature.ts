

export interface TemperatureConfig {
  weights: {
    EMAIL: number;
    CALL: number;
    WHATSAPP: number;
    MEETING: number;
    NOTE: number;
    TASK?: number;
    QUOTE_SENT?: number;
    VISIT?: number;
  };
  meetingWeight: number;
  taskWeight: number;
  recentDaysWindow: number;
  penaltyPerDayWithoutContact: number;
  thresholds: {
    warm: number;
    hot: number;
  };
}

export interface ActivityInput {
  type: string;
  occurredAt: Date;
}

export interface TemperatureResult {
  score: number;
  temperature: "COLD" | "WARM" | "HOT";
  explanation: string[];
}

/**
 * Función pura del dominio para calcular la temperatura comercial (Lead Scoring)
 * a partir de la interacción reciente y la falta de contacto.
 * 
 * Un cliente "HOT" requiere actividad sostenida y de alto valor (ej. reuniones, cotizaciones).
 * La falta de contacto prolongada penaliza severamente el puntaje.
 */
export function computeTemperature(input: {
  activities: ActivityInput[];
  meetingsHeld: number;
  tasksCompleted: number;
  lastContactAt: Date | null;
  now: Date;
  config: TemperatureConfig;
}): TemperatureResult {
  const { activities, meetingsHeld, tasksCompleted, lastContactAt, now, config } = input;
  const explanation: string[] = [];
  let score = 0;

  // 1. Filtrar actividades dentro de la ventana de tiempo (ej. 30 días)
  const cutoffDate = new Date(now.getTime() - config.recentDaysWindow * 24 * 60 * 60 * 1000);
  const recentActivities = activities.filter(a => a.occurredAt >= cutoffDate);
  
  const typeCounts: Record<string, number> = {};
  
  for (const act of recentActivities) {
    const weight = config.weights[act.type as keyof typeof config.weights] || 1;
    score += weight;
    typeCounts[act.type] = (typeCounts[act.type] || 0) + 1;
  }

  if (recentActivities.length > 0) {
    explanation.push(`+${recentActivities.length} interacciones en los últimos ${config.recentDaysWindow} días.`);
  } else {
    explanation.push(`Sin interacciones en los últimos ${config.recentDaysWindow} días.`);
  }

  // 2. Puntaje por compromisos de alto valor (Reuniones y Tareas cerradas)
  if (meetingsHeld > 0) {
    const meetingScore = meetingsHeld * config.meetingWeight;
    score += meetingScore;
    explanation.push(`+${meetingScore} pt(s) por ${meetingsHeld} reunión(es) realizada(s).`);
  }

  if (tasksCompleted > 0) {
    const taskScore = tasksCompleted * config.taskWeight;
    score += taskScore;
    explanation.push(`+${taskScore} pt(s) por ${tasksCompleted} tarea(s) completada(s).`);
  }

  // 3. Penalización por días sin contacto
  let daysSinceContact = config.recentDaysWindow + 1; // Máximo castigo por defecto
  if (lastContactAt) {
    const diffMs = now.getTime() - lastContactAt.getTime();
    daysSinceContact = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  if (daysSinceContact > 0) {
    const penalty = daysSinceContact * config.penaltyPerDayWithoutContact;
    score -= penalty;
    explanation.push(`-${penalty} pt(s) por ${daysSinceContact} día(s) sin contacto.`);
  }

  // Asegurar que el puntaje no sea negativo
  if (score < 0) score = 0;

  // 4. Determinar estado
  let temperature: "COLD" | "WARM" | "HOT" = "COLD";
  if (score >= config.thresholds.hot) {
    temperature = "HOT";
    explanation.unshift(`CALIENTE (${score} pts): Alta probabilidad y contacto frecuente.`);
  } else if (score >= config.thresholds.warm) {
    temperature = "WARM";
    explanation.unshift(`TIBIO (${score} pts): Hay tracción, requiere seguimiento de cierre.`);
  } else {
    temperature = "COLD";
    explanation.unshift(`FRÍO (${score} pts): Falta contacto o interés reciente.`);
  }

  return {
    score,
    temperature,
    explanation
  };
}
