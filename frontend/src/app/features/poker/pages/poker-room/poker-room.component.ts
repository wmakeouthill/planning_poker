import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PokerService } from '../../services/poker.service';
import { POKER_VALUES, PokerValue, PokerSession } from '../../models/poker.model';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-poker-room',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './poker-room.component.html',
    styleUrl: './poker-room.component.css'
})
export class PokerRoomComponent implements OnInit, OnDestroy {
    private readonly pokerService = inject(PokerService);
    private pollingSubscription?: Subscription;

    readonly POKER_VALUES = POKER_VALUES;
    readonly session = this.pokerService.currentSession;
    readonly participantName = this.pokerService.participantName;
    readonly loading = this.pokerService.loading;

    readonly selectedCard = signal<PokerValue | null>(null);
    readonly showJoinModal = signal(false);
    readonly showCreateModal = signal(false);
    readonly newSessionName = signal('');
    readonly tempName = signal('');

    // Computed values
    readonly hasVoted = computed(() => {
        const session = this.session();
        const name = this.participantName();
        if (!session || !name) return false;
        return session.votes.some(v => v.participantName === name && v.hasVoted);
    });

    readonly votedCount = computed(() => {
        const session = this.session();
        if (!session) return 0;
        return session.votes.filter(v => v.hasVoted).length;
    });

    readonly totalParticipants = computed(() => {
        const session = this.session();
        return session?.votes.length || 0;
    });

    ngOnInit() {
        this.pokerService.loadParticipantName();

        // Se não tem nome, mostrar modal
        if (!this.participantName()) {
            this.showJoinModal.set(true);
        } else {
            // Buscar sessão ativa
            this.pokerService.buscarSessaoAtiva().subscribe();
        }
    }

    ngOnDestroy() {
        this.pollingSubscription?.unsubscribe();
    }

    joinSession() {
        const name = this.tempName().trim();
        if (!name) return;

        this.pokerService.setParticipantName(name);
        this.showJoinModal.set(false);
        this.pokerService.buscarSessaoAtiva().subscribe();
    }

    openCreateModal() {
        this.showCreateModal.set(true);
        this.newSessionName.set('');
    }

    closeCreateModal() {
        this.showCreateModal.set(false);
    }

    createSession() {
        const name = this.newSessionName().trim() || 'Nova Sessão';

        this.pokerService.criarSessao({ name }).subscribe({
            next: (session) => {
                this.closeCreateModal();
                this.startPolling(session.id);
            }
        });
    }

    selectCard(value: PokerValue) {
        if (!this.session() || this.session()!.status !== 'VOTING') return;

        this.selectedCard.set(value);

        this.pokerService.votar({
            sessionId: this.session()!.id,
            participantName: this.participantName(),
            value
        }).subscribe();
    }

    revealVotes() {
        if (!this.session()) return;
        this.pokerService.revelarVotos(this.session()!.id).subscribe();
    }

    resetVotes() {
        if (!this.session()) return;
        this.selectedCard.set(null);
        this.pokerService.resetarVotos(this.session()!.id).subscribe();
    }

    private startPolling(sessionId: number) {
        this.pollingSubscription?.unsubscribe();
        this.pollingSubscription = this.pokerService.startPolling(sessionId).subscribe();
    }

    getCardPosition(index: number, total: number): { top: string; left: string; rotation: string } {
        // Posicionar participantes em círculo ao redor da mesa
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
        const radiusX = 40; // % do container
        const radiusY = 35;

        const x = 50 + radiusX * Math.cos(angle);
        const y = 50 + radiusY * Math.sin(angle);

        return {
            top: `${y}%`,
            left: `${x}%`,
            rotation: `${(angle * 180 / Math.PI) + 90}deg`
        };
    }
}
