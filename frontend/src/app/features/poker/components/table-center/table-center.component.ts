import { Component, Input } from '@angular/core';

/**
 * Componente Dumb para exibir informações no centro da mesa.
 * Responsabilidade única: apresentar status da votação ou resultado.
 */
@Component({
    selector: 'app-table-center',
    standalone: true,
    templateUrl: './table-center.component.html',
    styleUrl: './table-center.component.css'
})
export class TableCenterComponent {
    @Input() status: 'VOTING' | 'REVEALED' | 'CLOSED' = 'VOTING';
    @Input() votedCount = 0;
    @Input() totalParticipants = 0;
    @Input() averageVote: number | null = null;
}

