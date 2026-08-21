export interface HealthCheckResponse {
  readonly service: string;
  readonly status: 'ok';
  readonly timestamp: string;
  readonly storage: {
    readonly projectsRoot: string;
    readonly totalProjects: number;
  };
  readonly jobs: {
    readonly active: number;
  };
}
