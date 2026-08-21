import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import { logger } from '../lib/logger.js';

import type { CreateProjectInput, ProjectScript, VideoProject } from '../../../shared/index.js';

const PROJECT_DIRECTORIES = ['audio', 'images', 'subtitles', 'music', 'renders', 'final'] as const;

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function createProjectTitle(input: CreateProjectInput): string {
  const requestedTitle = input.title?.trim();

  if (requestedTitle) {
    return requestedTitle;
  }

  const compactIdea = input.idea.trim().replace(/\s+/g, ' ');
  return compactIdea.length > 80 ? `${compactIdea.slice(0, 77)}...` : compactIdea;
}

function isValidProjectId(projectId: string): boolean {
  return /^[a-z0-9-]{3,80}$/.test(projectId);
}

export class ProjectStoreService {
  constructor(private readonly projectsRoot: string) {}

  private resolveProjectRoot(projectId: string): string {
    if (!isValidProjectId(projectId)) {
      throw new Error('Identificador de proyecto inválido.');
    }

    const projectRoot = resolve(this.projectsRoot, projectId);
    const relativePath = relative(this.projectsRoot, projectRoot);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error('La ruta del proyecto es inválida.');
    }

    return projectRoot;
  }

  async ensureReady(): Promise<void> {
    await mkdir(this.projectsRoot, { recursive: true });
  }

  async listProjects(): Promise<VideoProject[]> {
    await this.ensureReady();

    const entries = await readdir(this.projectsRoot, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory());
    const projects = await Promise.all(
      directories.map(async (directory) => {
        try {
          return await this.getProject(directory.name);
        } catch {
          return null;
        }
      })
    );

    return projects
      .filter((project): project is VideoProject => project !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getProject(projectId: string): Promise<VideoProject> {
    const projectPath = join(this.resolveProjectRoot(projectId), 'project.json');
    const content = await readFile(projectPath, 'utf8');
    return JSON.parse(content) as VideoProject;
  }

  async getStorageSummary(): Promise<{ projectsRoot: string; totalProjects: number }> {
    await this.ensureReady();

    const entries = await readdir(this.projectsRoot, { withFileTypes: true });
    const totalProjects = entries.filter((entry) => entry.isDirectory()).length;

    return {
      projectsRoot: this.projectsRoot,
      totalProjects
    };
  }

  async createProject(input: CreateProjectInput): Promise<VideoProject> {
    const idea = input.idea.trim();
    const title = createProjectTitle(input);
    const timestamp = new Date().toISOString();
    const safeTitle = slugifyTitle(title) || 'ai-video-project';
    const projectId = `${safeTitle}-${randomUUID().slice(0, 8)}`;
    const projectRoot = resolve(this.projectsRoot, projectId);

    await mkdir(projectRoot, { recursive: true });
    await Promise.all(PROJECT_DIRECTORIES.map((directory) => mkdir(join(projectRoot, directory), { recursive: true })));

    const project: VideoProject = {
      id: projectId,
      title,
      idea,
      durationSeconds: input.durationSeconds ?? 60,
      aspectRatio: '9:16',
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp,
      paths: {
        audio: join(projectRoot, 'audio'),
        images: join(projectRoot, 'images'),
        subtitles: join(projectRoot, 'subtitles'),
        music: join(projectRoot, 'music'),
        renders: join(projectRoot, 'renders'),
        final: join(projectRoot, 'final')
      }
    };

    const script: ProjectScript = {
      projectId,
      hookOptions: [],
      selectedHookId: null,
      scenes: [],
      updatedAt: timestamp
    };

    await Promise.all([
      writeFile(join(projectRoot, 'project.json'), JSON.stringify(project, null, 2), 'utf8'),
      writeFile(join(projectRoot, 'script.json'), JSON.stringify(script, null, 2), 'utf8')
    ]);

    logger.info('Project scaffold created', { projectId, projectRoot });
    return project;
  }

  async hasProject(projectId: string): Promise<boolean> {
    try {
      const projectDirectory = this.resolveProjectRoot(projectId);
      const details = await stat(projectDirectory);
      return details.isDirectory();
    } catch {
      return false;
    }
  }
}
