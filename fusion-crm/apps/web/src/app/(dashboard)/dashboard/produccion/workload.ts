import { workingDaysBetween, type WorkCalendar } from '../../../../../../../packages/core/src/calendar/workCalendar';

/**
 * Carga de producción y entregas: qué OT están atrasadas, cuáles vencen hoy o esta semana
 * (en días hábiles del calendario laboral) y cuántas hay en cada etapa.
 */

export type DueBucket = 'OVERDUE' | 'TODAY' | 'SOON' | 'LATER' | 'NO_DATE';

export const BUCKET_LABEL: Record<DueBucket, string> = {
  OVERDUE: 'Atrasadas',
  TODAY: 'Vencen hoy',
  SOON: 'Próximos 5 días hábiles',
  LATER: 'Más adelante',
  NO_DATE: 'Sin fecha de entrega',
};

export interface LoadStage {
  id: string;
  key: string;
  name: string;
  isArchivedStage: boolean;
}

export interface LoadProject {
  id: string;
  number?: string;
  name?: string;
  client?: string;
  stageId?: string | null;
  dueDate?: string | null;
  priority?: string;
}

export interface LoadRow {
  project: LoadProject;
  stage: LoadStage | undefined;
  due: string | null;
  /** Días hábiles hasta la entrega (negativo si está atrasada). */
  workingDaysLeft: number | null;
  bucket: DueBucket;
}

const stageOf = (p: LoadProject, stages: LoadStage[]) =>
  stages.find((s) => s.id === p.stageId || s.key === p.stageId) ?? (!p.stageId || p.stageId === 'POR_REVISAR' ? stages[0] : undefined);

/** Fecha de entrega en YYYY-MM-DD si es una fecha (hay OT antiguas con texto como "5 días hábiles"). */
export function dueYmd(value: unknown): string | null {
  const m = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  return m && !Number.isNaN(Date.parse(m[1])) ? m[1] : null;
}

export function buildWorkload(projects: LoadProject[], stages: LoadStage[], cal: WorkCalendar, todayYmd: string) {
  const rows: LoadRow[] = projects
    .map((project) => ({ project, stage: stageOf(project, stages) }))
    .filter((r) => !r.stage?.isArchivedStage)
    .map(({ project, stage }) => {
      const due = dueYmd(project.dueDate);
      const left = due ? workingDaysBetween(todayYmd, due, cal) : null;
      const bucket: DueBucket = !due ? 'NO_DATE' : due < todayYmd ? 'OVERDUE' : due === todayYmd ? 'TODAY' : (left ?? 0) <= 5 ? 'SOON' : 'LATER';
      return { project, stage, due, workingDaysLeft: left, bucket };
    })
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));

  const byBucket = (Object.keys(BUCKET_LABEL) as DueBucket[]).map((bucket) => ({ bucket, rows: rows.filter((r) => r.bucket === bucket) }));
  const byStage = stages
    .filter((s) => !s.isArchivedStage)
    .map((stage) => ({
      stage,
      total: rows.filter((r) => r.stage?.id === stage.id).length,
      overdue: rows.filter((r) => r.stage?.id === stage.id && r.bucket === 'OVERDUE').length,
    }));
  return { rows, byBucket, byStage };
}
