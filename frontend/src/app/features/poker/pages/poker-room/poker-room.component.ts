import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
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
        const myVote = session.votes.find(v => v.participantName === name);
        return myVote?.hasVoted ?? false;
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

    readonly myVote = computed(() => {
        const session = this.session();
        const name = this.participantName();
        if (!session || !name) return null;
        return session.votes.find(v => v.participantName === name);
    });

    constructor() {
        // Effect para sincronizar selectedCard com myVote
        effect(() => {
            const myVote = this.myVote();
            const session = this.session();
            
            if (session?.status === 'VOTING') {
                if (myVote?.hasVoted && myVote.value) {
                    this.selectedCard.set(myVote.value as PokerValue);
                } else if (!myVote?.hasVoted) {
                    this.selectedCard.set(null);
                }
            } else {
                this.selectedCard.set(null);
            }
        });
    }

    ngOnInit() {
        this.pokerService.loadParticipantName();

        // Se não tem nome, mostrar modal
        if (!this.participantName()) {
            this.showJoinModal.set(true);
        } else {
            // Buscar sessão ativa e iniciar polling
            this.pokerService.buscarSessaoAtiva().subscribe({
                next: (session) => {
                    if (session) {
                        this.startPolling(session.id);
                    }
                }
            });
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
        this.pokerService.buscarSessaoAtiva().subscribe({
            next: (session) => {
                if (session) {
                    this.startPolling(session.id);
                }
            }
        });
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
        const session = this.session();
        if (!session || session.status !== 'VOTING') return;

        this.selectedCard.set(value);

        this.pokerService.votar({
            sessionId: session.id,
            participantName: this.participantName()!,
            value
        }).subscribe({
            next: () => {
                // Atualizar sessão após votar
                this.pokerService.buscarSessao(session.id).subscribe();
            }
        });
    }

    revealVotes() {
        const session = this.session();
        if (!session) return;
        this.pokerService.revelarVotos(session.id).subscribe({
            next: () => {
                this.pokerService.buscarSessao(session.id).subscribe();
            }
        });
    }

    resetVotes() {
        const session = this.session();
        if (!session) return;
        this.selectedCard.set(null);
        this.pokerService.resetarVotos(session.id).subscribe({
            next: () => {
                this.pokerService.buscarSessao(session.id).subscribe();
            }
        });
    }

    private startPolling(sessionId: number) {
        this.pollingSubscription?.unsubscribe();
        this.pollingSubscription = this.pokerService.startPolling(sessionId).subscribe({
            next: (session) => {
                // Atualizar sessão com dados mais recentes
                this.pokerService.currentSession.set(session);
                
                // Se a sessão foi fechada, parar polling
                if (session.status === 'CLOSED') {
                    this.pollingSubscription?.unsubscribe();
                }
            },
            error: (error) => {
                console.error('Erro no polling:', error);
                // Parar polling em caso de erro
                this.pollingSubscription?.unsubscribe();
            }
        });
    }

    getCardPosition(index: number, total: number): { top: string; left: string; rotation: string } {
        // Posicionar participantes em círculo ao redor da mesa
        // Ajustar raio baseado no número de participantes
        const baseRadius = total <= 4 ? 35 : total <= 6 ? 40 : 45;
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
        const radiusX = baseRadius; // % do container
        const radiusY = baseRadius * 0.85; // Ajuste para formato elíptico

        const x = 50 + radiusX * Math.cos(angle);
        const y = 50 + radiusY * Math.sin(angle);

        return {
            top: `${y}%`,
            left: `${x}%`,
            rotation: `${(angle * 180 / Math.PI) + 90}deg`
        };
    }
}
