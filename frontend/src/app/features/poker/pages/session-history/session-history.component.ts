import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PokerService } from '../../services/poker.service';
import { PokerSession } from '../../models/poker.model';

/**
 * Componente Smart para exibir histórico de sessões de poker.
 * Responsabilidade única: gerenciar estado e lógica da página de histórico.
 */
@Component({
    selector: 'app-session-history',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './session-history.component.html',
    styleUrl: './session-history.component.css'
})
export class SessionHistoryComponent implements OnInit {
    private readonly pokerService = inject(PokerService);
    private readonly router = inject(Router);

    readonly loading = this.pokerService.loading;
    readonly sessions = signal<PokerSession[]>([]);
    readonly currentPage = signal(0);
    readonly pageSize = signal(10);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);
    readonly selectedStatus = signal<'VOTING' | 'REVEALED' | 'CLOSED' | null>(null);

    readonly hasNext = computed(() => this.currentPage() < this.totalPages() - 1);
    readonly hasPrevious = computed(() => this.currentPage() > 0);

    ngOnInit(): void {
        this.carregarHistorico();
    }

    carregarHistorico(): void {
        this.pokerService.listarHistorico(
            this.currentPage(),
            this.pageSize(),
            this.selectedStatus() || undefined
        ).subscribe({
            next: (response) => {
                this.sessions.set(response.content);
                this.totalElements.set(response.totalElements);
                this.totalPages.set(response.totalPages);
            },
            error: (error) => {
                console.error('Erro ao carregar histórico:', error);
            }
        });
    }

    filtrarPorStatus(status: 'VOTING' | 'REVEALED' | 'CLOSED' | null): void {
        this.selectedStatus.set(status);
        this.currentPage.set(0);
        this.carregarHistorico();
    }

    proximaPagina(): void {
        if (this.hasNext()) {
            this.currentPage.set(this.currentPage() + 1);
            this.carregarHistorico();
        }
    }

    paginaAnterior(): void {
        if (this.hasPrevious()) {
            this.currentPage.set(this.currentPage() - 1);
            this.carregarHistorico();
        }
    }

    irParaPagina(page: number): void {
        if (page >= 0 && page < this.totalPages()) {
            this.currentPage.set(page);
            this.carregarHistorico();
        }
    }

    abrirSessao(sessionId: number): void {
        this.router.navigate(['/poker', sessionId]);
    }

    formatarData(data: string): string {
        return new Date(data).toLocaleString('pt-BR');
    }

    getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'VOTING': 'Votação',
            'REVEALED': 'Revelada',
            'CLOSED': 'Fechada'
        };
        return labels[status] || status;
    }

    getStatusClass(status: string): string {
        const classes: Record<string, string> = {
            'VOTING': 'status-voting',
            'REVEALED': 'status-revealed',
            'CLOSED': 'status-closed'
        };
        return classes[status] || '';
    }
}

