import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Vote } from '../../models/poker.model';

/**
 * Componente Dumb para exibir lista de progresso dos participantes.
 * Responsabilidade única: apresentar visualmente o progresso da votação.
 */
@Component({
    selector: 'app-progress-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './progress-list.component.html',
    styleUrl: './progress-list.component.css'
})
export class ProgressListComponent {
    @Input({ required: true }) votes: Vote[] = [];
    @Input() status: 'VOTING' | 'REVEALED' | 'CLOSED' = 'VOTING';

    // Usar getters em vez de computed - @Input não é signal, computed não reage a mudanças de @Input
    get votedCount(): number {
        return this.votes.filter(v => v.hasVoted).length;
    }

    get totalParticipants(): number {
        return this.votes.length;
    }

    get progressPercentage(): number {
        const total = this.totalParticipants;
        if (total === 0) return 0;
        return Math.round((this.votedCount / total) * 100);
    }
}

