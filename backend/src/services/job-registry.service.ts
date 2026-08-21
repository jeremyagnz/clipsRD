import { randomUUID } from 'node:crypto';

import type { GenerationJob, GenerationStage } from '../../../shared/index.js';

export class JobRegistryService {
  private readonly jobs = new Map<string, GenerationJob>();

  create(projectId: string, stage: GenerationStage): GenerationJob {
    const timestamp = new Date().toISOString();
    const job: GenerationJob = {
      id: randomUUID(),
      projectId,
      stage,
      progress: 0,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.jobs.set(job.id, job);
    return job;
  }

  update(jobId: string, update: Partial<GenerationJob>): GenerationJob | null {
    const current = this.jobs.get(jobId);

    if (!current) {
      return null;
    }

    const next: GenerationJob = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, next);
    return next;
  }

  cancel(jobId: string): GenerationJob | null {
    return this.update(jobId, { status: 'cancelled', progress: 0 });
  }

  countActive(): number {
    return [...this.jobs.values()].filter((job) => job.status === 'pending' || job.status === 'running')
      .length;
  }
}
