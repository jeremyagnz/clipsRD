import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatProgressBarModule,
    MatToolbarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = 'AI Video Studio';
  protected readonly stages = [
    'Idea',
    'Hooks',
    'Guion',
    'Escenas',
    'Imágenes',
    'Voz',
    'Subtítulos',
    'Render MP4'
  ] as const;
  protected readonly capabilities = [
    {
      title: 'Frontend Angular',
      description: 'Panel responsive con Angular Material para iniciar proyectos, revisar progreso y visualizar renders.'
    },
    {
      title: 'Backend modular',
      description: 'API Express en TypeScript estricto, lista para jobs asíncronos, cancelación y proveedores IA intercambiables.'
    },
    {
      title: 'Persistencia local',
      description: 'Cada proyecto vive en archivos JSON y carpetas locales bajo generated/projects/{projectId}.'
    }
  ] as const;
  protected readonly milestones = [
    'Arquitectura local orientada a pipeline',
    'Providers compartidos para LLM, TTS e imágenes',
    'Health check y scaffolding de proyectos por archivo',
    'Preparado para Netlify en el frontend'
  ] as const;
}
