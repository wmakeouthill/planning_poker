import { Component, inject, OnInit, signal, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';
import { SlashCommandMenuComponent, SlashCommand } from '../../components/slash-command-menu/slash-command-menu.component';

@Component({
    selector: 'app-board-editor',
    standalone: true,
    imports: [FormsModule, SlashCommandMenuComponent],
    templateUrl: './board-editor.component.html',
    styleUrl: './board-editor.component.css'
})
export class BoardEditorComponent implements OnInit {
    @Input() id!: string;
    @ViewChild('contentTextarea') contentTextarea!: ElementRef<HTMLTextAreaElement>;

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

    // Slash command state
    readonly showSlashMenu = signal(false);
    readonly slashMenuPosition = signal({ top: 0, left: 0 });
    readonly slashFilter = signal('');
    private slashStartPosition = 0;

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

    // ========== Slash Command Logic ==========

    onContentInput(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        const value = textarea.value;
        const cursorPos = textarea.selectionStart;

        this.content.set(value);

        // Check if we should show slash menu
        if (this.showSlashMenu()) {
            // Update filter based on text after slash
            const textAfterSlash = value.substring(this.slashStartPosition + 1, cursorPos);
            this.slashFilter.set(textAfterSlash);

            // Close if user backspaced past the slash
            if (cursorPos <= this.slashStartPosition) {
                this.closeSlashMenu();
            }
        }
    }

    onContentKeydown(event: KeyboardEvent) {
        const textarea = event.target as HTMLTextAreaElement;

        // Handle slash key to open menu
        if (event.key === '/' && !this.showSlashMenu()) {
            const cursorPos = textarea.selectionStart;
            const textBefore = textarea.value.substring(0, cursorPos);

            // Only open if at start of line or after whitespace
            if (cursorPos === 0 || /\s$/.test(textBefore)) {
                // Calculate position
                const position = this.calculateCursorPosition(textarea);
                this.slashMenuPosition.set(position);
                this.slashStartPosition = cursorPos;
                this.slashFilter.set('');

                // Delay showing to let the "/" be typed first
                setTimeout(() => this.showSlashMenu.set(true), 10);
            }
        }

        // Let slash menu handle navigation when open
        if (this.showSlashMenu() && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
            // Prevent default for Enter to avoid newline
            if (event.key === 'Enter') {
                event.preventDefault();
            }
        }
    }

    private calculateCursorPosition(textarea: HTMLTextAreaElement): { top: number; left: number } {
        const rect = textarea.getBoundingClientRect();
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseInt(style.lineHeight) || 24;
        const paddingTop = parseInt(style.paddingTop) || 0;
        const paddingLeft = parseInt(style.paddingLeft) || 0;

        // Get cursor position in text
        const text = textarea.value.substring(0, textarea.selectionStart);
        const lines = text.split('\n');
        const currentLineIndex = lines.length - 1;

        // Approximate position (simplified calculation)
        const top = rect.top + paddingTop + (currentLineIndex * lineHeight) + lineHeight + 5;
        const left = rect.left + paddingLeft + 10;

        return {
            top: Math.min(top, window.innerHeight - 420), // Ensure menu fits
            left: Math.min(left, window.innerWidth - 350)
        };
    }

    onCommandSelected(command: SlashCommand) {
        const textarea = this.contentTextarea?.nativeElement;
        if (!textarea) {
            this.closeSlashMenu();
            return;
        }

        // Get current content and cursor position
        const value = this.content();
        const cursorPos = textarea.selectionStart;

        // Remove the "/" and any filter text
        const beforeSlash = value.substring(0, this.slashStartPosition);
        const afterCursor = value.substring(cursorPos);

        // Insert the command syntax
        const newContent = beforeSlash + command.syntax + afterCursor;
        this.content.set(newContent);

        // Close menu
        this.closeSlashMenu();

        // Set cursor position after the inserted syntax
        setTimeout(() => {
            const newCursorPos = this.slashStartPosition + command.syntax.length;
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }

    closeSlashMenu() {
        this.showSlashMenu.set(false);
        this.slashFilter.set('');
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        // Close menu if clicking outside
        if (this.showSlashMenu()) {
            const target = event.target as HTMLElement;
            if (!target.closest('.slash-menu') && !target.closest('.markdown-editor')) {
                this.closeSlashMenu();
            }
        }
    }

    // Simple markdown to HTML converter
    renderMarkdown(text: string): string {
        if (!text) return '';

        return text
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Blockquotes
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Checkboxes
            .replace(/^\- \[ \] (.*$)/gim, '<li class="todo"><input type="checkbox" disabled> $1</li>')
            .replace(/^\- \[x\] (.*$)/gim, '<li class="todo done"><input type="checkbox" checked disabled> $1</li>')
            // Lists
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            // Horizontal rule
            .replace(/^---$/gim, '<hr>')
            // Line breaks
            .replace(/\n/g, '<br/>');
    }
}
