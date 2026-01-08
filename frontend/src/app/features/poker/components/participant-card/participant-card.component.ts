import { Component, Input, output } from '@angular/core';
import { Vote } from '../../models/poker.model';

/**
 * Componente Dumb para exibir carta de participante com animação de flip.
 * Responsabilidade única: apresentar visualmente a carta do participante.
 */
@Component({
    selector: 'app-participant-card',
    standalone: true,
    templateUrl: './participant-card.component.html',
    styleUrl: './participant-card.component.css'
})
export class ParticipantCardComponent {
    @Input({ required: true }) vote!: Vote;
    @Input({ required: true }) participantName!: string;
    @Input() top = '50%';
    @Input() left = '50%';

    readonly cardClicked = output<{ vote: Vote; element: HTMLElement }>();

    onCardClick(event: MouseEvent): void {
        const target = event.currentTarget as HTMLElement;
        this.cardClicked.emit({ vote: this.vote, element: target });
    }
}
