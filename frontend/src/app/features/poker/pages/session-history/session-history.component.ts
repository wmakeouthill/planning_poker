import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PokerService } from '../../services/poker.service';
import { PokerSession, Vote } from '../../models/poker.model';

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

    getTotalParticipantes(session: PokerSession): number {
        return session.votes?.length || 0;
    }

    getVotosRevelados(session: PokerSession): Vote[] {
        if (!session.votes) return [];
        // Se a sessão está revelada ou fechada, mostra todos os votos que foram dados
        if (session.status === 'REVEALED' || session.status === 'CLOSED') {
            return session.votes.filter(v => v.hasVoted && v.value && v.value.trim() !== '');
        }
        return [];
    }

    getVotoMinimo(session: PokerSession): string {
        const votos = this.getVotosRevelados(session)
            .map(v => this.parseVoteValue(v.value))
            .filter(v => v !== null && !isNaN(v)) as number[];
        
        if (votos.length === 0) return '-';
        const min = Math.min(...votos);
        return min === 0.5 ? '½' : min.toString();
    }

    getVotoMaximo(session: PokerSession): string {
        const votos = this.getVotosRevelados(session)
            .map(v => this.parseVoteValue(v.value))
            .filter(v => v !== null && !isNaN(v)) as number[];
        
        if (votos.length === 0) return '-';
        const max = Math.max(...votos);
        return max === 0.5 ? '½' : max.toString();
    }

    getConsenso(session: PokerSession): string {
        const votos = this.getVotosRevelados(session)
            .map(v => v.value)
            .filter(v => v && v.trim() !== '' && v !== '?' && v !== '☕');
        
        if (votos.length === 0) return 'N/A';
        
        const valoresUnicos = new Set(votos);
        if (valoresUnicos.size === 1) {
            return 'Sim';
        }
        
        // Verifica se há consenso (80% ou mais votaram o mesmo valor)
        const contagem: Record<string, number> = {};
        votos.forEach(v => {
            contagem[v] = (contagem[v] || 0) + 1;
        });
        
        const maxCount = Math.max(...Object.values(contagem));
        const porcentagem = (maxCount / votos.length) * 100;
        
        return porcentagem >= 80 ? 'Sim' : 'Não';
    }

    private parseVoteValue(value: string | null | undefined): number | null {
        if (!value || value === '?' || value === '☕') return null;
        if (value === '½') return 0.5;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
}

