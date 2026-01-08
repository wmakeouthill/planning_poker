import { Injectable, signal, effect } from '@angular/core';
import { PokerSession } from '../models/poker.model';

/**
 * Serviço WebSocket para comunicação em tempo real.
 * Usa Signals para reatividade.
 * 
 * NOTA: Implementação simplificada usando polling + Signals.
 * Para WebSocket completo, instalar: sockjs-client e @stomp/stompjs
 */
@Injectable({ providedIn: 'root' })
export class PokerWebSocketService {
    // Signals para eventos em tempo real
    readonly sessionUpdate = signal<PokerSession | null>(null);
    readonly animationEvent = signal<{
        id: string;
        type: 'paper-ball' | 'emoji';
        participantName: string;
        targetCard?: string;
        emoji?: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);

    /**
     * Envia evento de animação (emoji ou bola de papel).
     */
    sendAnimation(
        type: 'paper-ball' | 'emoji',
        participantName: string,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        targetCard?: string,
        emoji?: string
    ): void {
        const id = `${Date.now()}-${Math.random()}`;
        this.animationEvent.set({
            id,
            type,
            participantName,
            targetCard,
            emoji,
            startX,
            startY,
            endX,
            endY
        });

        // Limpar após 3 segundos
        setTimeout(() => {
            if (this.animationEvent()?.id === id) {
                this.animationEvent.set(null);
            }
        }, 3000);
    }
}

