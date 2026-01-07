import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';

@Component({
    selector: 'app-board-list',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './board-list.component.html',
    styleUrl: './board-list.component.css'
})
export class BoardListComponent implements OnInit {
    private readonly boardService = inject(BoardService);

    readonly boards = this.boardService.boards;
    readonly loading = this.boardService.loading;
    readonly showCreateModal = signal(false);
    readonly newBoardTitle = signal('');
    readonly newBoardDescription = signal('');

    ngOnInit() {
        this.boardService.listar().subscribe();
    }

    openCreateModal() {
        this.showCreateModal.set(true);
        this.newBoardTitle.set('');
        this.newBoardDescription.set('');
    }

    closeCreateModal() {
        this.showCreateModal.set(false);
    }

    createBoard() {
        const title = this.newBoardTitle();
        const description = this.newBoardDescription();

        if (!title.trim()) return;

        this.boardService.criar({ title, description }).subscribe({
            next: () => {
                this.closeCreateModal();
            }
        });
    }

    deleteBoard(event: Event, id: number) {
        event.preventDefault();
        event.stopPropagation();

        if (confirm('Tem certeza que deseja excluir este board?')) {
            this.boardService.excluir(id).subscribe();
        }
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
}
