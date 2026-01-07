import { Component, inject, OnInit, signal, Input } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';

@Component({
    selector: 'app-board-editor',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './board-editor.component.html',
    styleUrl: './board-editor.component.css'
})
export class BoardEditorComponent implements OnInit {
    @Input() id!: string;

    private readonly boardService = inject(BoardService);
    private readonly router = inject(Router);

    readonly board = signal<Board | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly viewMode = signal<'edit' | 'preview'>('edit');

    // Editable fields
    readonly title = signal('');
    readonly description = signal('');
    readonly content = signal('');

    ngOnInit() {
        if (this.id) {
            this.loadBoard(Number(this.id));
        }
    }

    private loadBoard(id: number) {
        this.loading.set(true);
        this.boardService.buscarPorId(id).subscribe({
            next: (board) => {
                this.board.set(board);
                this.title.set(board.title);
                this.description.set(board.description || '');
                this.content.set(board.content || '');
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.router.navigate(['/boards']);
            }
        });
    }

    save() {
        if (!this.board()) return;

        this.saving.set(true);
        this.boardService.atualizar(this.board()!.id, {
            title: this.title(),
            description: this.description(),
            content: this.content()
        }).subscribe({
            next: () => {
                this.saving.set(false);
            },
            error: () => {
                this.saving.set(false);
            }
        });
    }

    goBack() {
        this.router.navigate(['/boards']);
    }

    toggleView() {
        this.viewMode.update(v => v === 'edit' ? 'preview' : 'edit');
    }

    // Simple markdown to HTML converter
    renderMarkdown(text: string): string {
        if (!text) return '';

        return text
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            // Line breaks
            .replace(/\n/g, '<br/>');
    }
}
