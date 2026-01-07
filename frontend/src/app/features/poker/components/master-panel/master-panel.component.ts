import { Component, Input } from '@angular/core';
import { Vote } from '../../models/poker.model';

/**
 * Componente Dumb para exibir painel do mestre com votos revelados.
 * Responsabilidade única: apresentar informações dos votos para o mestre.
 */
@Component({
    selector: 'app-master-panel',
    standalone: true,
    templateUrl: './master-panel.component.html',
    styleUrl: './master-panel.component.css'
})
export class MasterPanelComponent {
    @Input({ required: true }) votes!: Vote[];
    @Input() averageVote: number | null = null;

    /**
     * Ordena votos por valor numérico (excluindo ? e ☕).
     */
    get sortedVotes(): Vote[] {
        return [...this.votes]
            .filter(v => v.revealed && v.value)
            .sort((a, b) => {
                const valA = this.parseVoteValue(a.value);
                const valB = this.parseVoteValue(b.value);
                return valB - valA;
            });
    }

    private parseVoteValue(value: string): number {
        if (value === '?' || value === '☕') return -1;
        if (value === '½') return 0.5;
        return parseFloat(value) || 0;
    }
}

