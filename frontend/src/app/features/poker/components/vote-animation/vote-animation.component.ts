import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokerWebSocketService } from '../../services/poker-websocket.service';

/**
 * Componente Dumb para exibir animações de voto (bola de papel, emojis).
 * Responsabilidade única: apresentar animações visuais.
 */
@Component({
    selector: 'app-vote-animation',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './vote-animation.component.html',
    styleUrl: './vote-animation.component.css'
})
export class VoteAnimationComponent {
    readonly activeAnimations = signal<Array<{
        id: string;
        type: 'paper-ball' | 'emoji';
        participantName: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    }>>([]);

    constructor(private wsService: PokerWebSocketService) {
        // Observa eventos de animação
        effect(() => {
            const event = this.wsService.animationEvent();
            if (event) {
                this.addAnimation(event);
            }
        });
    }

    private addAnimation(event: {
        id: string;
        type: 'paper-ball' | 'emoji';
        participantName: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    }): void {
        const animations = this.activeAnimations();
        this.activeAnimations.set([...animations, event]);
        
        // Remover após animação
        setTimeout(() => {
            this.activeAnimations.set(
                this.activeAnimations().filter(a => a.id !== event.id)
            );
        }, 2000);
    }
}

