import { Component, Input, computed } from '@angular/core';
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

    readonly votedCount = computed(() => {
        return this.votes.filter(v => v.hasVoted).length;
    });

    readonly totalParticipants = computed(() => {
        return this.votes.length;
    });

    readonly progressPercentage = computed(() => {
        const total = this.totalParticipants();
        if (total === 0) return 0;
        return Math.round((this.votedCount() / total) * 100);
    });
}

