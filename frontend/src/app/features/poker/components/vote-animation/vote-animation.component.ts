import { Component, signal } from '@angular/core';

/**
 * Componente para exibir animações de emoji arremessado.
 * Simplificado para evitar loops de reatividade.
 */
@Component({
    selector: 'app-vote-animation',
    standalone: true,
    templateUrl: './vote-animation.component.html',
    styleUrl: './vote-animation.component.css'
})
export class VoteAnimationComponent {
    readonly activeAnimations = signal<Array<{
        id: string;
        emoji: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    }>>([]);

    /**
     * Adiciona uma animação de emoji.
     */
    throwEmoji(emoji: string, startX: number, startY: number, endX: number, endY: number): void {
        const id = `${Date.now()}-${Math.random()}`;
        const animation = { id, emoji, startX, startY, endX, endY };

        this.activeAnimations.update(arr => [...arr, animation]);

        // Remover após 2.5 segundos
        setTimeout(() => {
            this.activeAnimations.update(arr => arr.filter(a => a.id !== id));
        }, 2500);
    }

    /**
     * Adiciona uma animação de bola de papel.
     */
    throwPaperBall(startX: number, startY: number, endX: number, endY: number): void {
        // Usar emoji de papel para representar bola de papel
        this.throwEmoji('🗞️', startX, startY, endX, endY);
    }
}

