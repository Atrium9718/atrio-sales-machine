export * from './jobs/collaborationJobs';
export * from './jobs/voiceJobs';

import { COLLABORATION_SCHEDULED_JOBS } from './jobs/collaborationJobs';
import { VOICE_SCHEDULED_JOBS } from './jobs/voiceJobs';

export function getAllScheduledJobs() {
  return [
    ...Object.values(COLLABORATION_SCHEDULED_JOBS),
    ...Object.values(VOICE_SCHEDULED_JOBS),
  ];
}
