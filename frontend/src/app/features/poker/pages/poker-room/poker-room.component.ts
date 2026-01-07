import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PokerService } from '../../services/poker.service';
import { PokerWebSocketService } from '../../services/poker-websocket.service';
import { POKER_VALUES, PokerValue } from '../../models/poker.model';
import { ParticipantCardComponent } from '../../components/participant-card/participant-card.component';
import { MasterPanelComponent } from '../../components/master-panel/master-panel.component';
import { TableCenterComponent } from '../../components/table-center/table-center.component';
import { VoteAnimationComponent } from '../../components/vote-animation/vote-animation.component';
import { InviteLinkComponent } from '../../components/invite-link/invite-link.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-poker-room',
    standalone: true,
    imports: [
        FormsModule,
        ParticipantCardComponent,
        MasterPanelComponent,
        TableCenterComponent,
        VoteAnimationComponent,
        InviteLinkComponent
    ],
    templateUrl: './poker-room.component.html',
    styleUrl: './poker-room.component.css'
})
export class PokerRoomComponent implements OnInit, OnDestroy {
    private readonly pokerService = inject(PokerService);
    private readonly wsService = inject(PokerWebSocketService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private pollingSubscription?: Subscription;

    readonly POKER_VALUES = POKER_VALUES;
    readonly session = this.pokerService.currentSession;
    readonly participantName = this.pokerService.participantName;
    readonly loading = this.pokerService.loading;

    readonly inviteUrl = computed(() => {
        const session = this.session();
        const code = session?.inviteCode;
        return code ? `${window.location.origin}/poker/join/${code}` : null;
    });

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

    // Verifica se o usuário atual é o mestre (criador da sessão)
    readonly isMaster = computed(() => {
        const session = this.session();
        const name = this.participantName();
        if (!session || !name) return false;
        // Se não tem createdBy, considera o primeiro participante como mestre
        return session.createdBy === name || (!session.createdBy && session.votes.length > 0 && session.votes[0].participantName === name);
    });

    // Votos revelados para o painel do mestre
    readonly revealedVotes = computed(() => {
        const session = this.session();
        if (!session || session.status !== 'REVEALED') return [];
        return session.votes.filter(v => v.revealed && v.value);
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

        // Verificar se há um ID na rota
        const sessionId = this.route.snapshot.paramMap.get('id');
        
        if (sessionId) {
            // Carregar sessão específica pelo ID
            this.carregarSessaoPorId(Number(sessionId));
        } else {
            // Comportamento padrão: buscar sessão ativa
            this.carregarSessaoAtiva();
        }
    }

    private carregarSessaoPorId(sessionId: number): void {
        // Se não tem nome, mostrar modal
        if (!this.participantName()) {
            this.showJoinModal.set(true);
            // Quando o usuário entrar, carregar a sessão
            return;
        }

        // Carregar sessão imediatamente para mostrar o link de convite
        this.pokerService.buscarSessao(sessionId).subscribe({
            next: (session) => {
                // A sessão já foi atualizada no serviço, então o inviteUrl já deve estar disponível
                const name = this.participantName();
                // Verificar se o participante já está na sessão
                const isInSession = session.votes.some(v => v.participantName === name);
                if (!isInSession && name) {
                    // Criar voto vazio para o participante aparecer na mesa
                    this.pokerService.votar({
                        sessionId: session.id,
                        participantName: name,
                        value: ''
                    }).subscribe({
                        next: () => {
                            this.startPolling(session.id);
                        },
                        error: () => {
                            // Se falhar ao votar, ainda tenta iniciar polling
                            this.startPolling(session.id);
                        }
                    });
                } else {
                    this.startPolling(session.id);
                }
            },
            error: (error) => {
                console.error('Erro ao carregar sessão:', error);
                // Redirecionar para a página de poker se a sessão não for encontrada
                this.router.navigate(['/poker']);
            }
        });
    }

    private carregarSessaoAtiva(): void {
        // Se não tem nome, mostrar modal
        if (!this.participantName()) {
            this.showJoinModal.set(true);
        } else {
            // Buscar sessão ativa e iniciar polling
            // A sessão já será atualizada no serviço, então o inviteUrl já deve estar disponível
            this.pokerService.buscarSessaoAtiva().subscribe({
                next: (session) => {
                    if (session) {
                        const name = this.participantName();
                        // Verificar se o participante já está na sessão
                        const isInSession = session.votes.some(v => v.participantName === name);
                        if (!isInSession && name) {
                            // Criar voto vazio para o participante aparecer na mesa
                            this.pokerService.votar({
                                sessionId: session.id,
                                participantName: name,
                                value: ''
                            }).subscribe({
                                next: () => {
                                    this.startPolling(session.id);
                                },
                                error: () => {
                                    // Se falhar ao votar, ainda tenta iniciar polling
                                    this.startPolling(session.id);
                                }
                            });
                        } else {
                            this.startPolling(session.id);
                        }
                    }
                },
                error: () => {
                    // Erro silencioso - não há sessão ativa é um caso normal
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
        
        // Verificar se há um ID na rota
        const sessionId = this.route.snapshot.paramMap.get('id');
        
        if (sessionId) {
            // Carregar sessão específica pelo ID
            this.carregarSessaoPorId(Number(sessionId));
        } else {
            // Buscar sessão ativa
            this.pokerService.buscarSessaoAtiva().subscribe({
                next: (session) => {
                    if (session) {
                        // Criar voto vazio para o participante aparecer na mesa
                        this.pokerService.votar({
                            sessionId: session.id,
                            participantName: name,
                            value: ''
                        }).subscribe({
                            next: () => {
                                this.startPolling(session.id);
                            }
                        });
                    }
                }
            });
        }
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
        const participantName = this.participantName();

        this.pokerService.criarSessao({ name }).subscribe({
            next: (session) => {
                // Marcar o criador da sessão
                if (session && participantName) {
                    session.createdBy = participantName;
                    this.pokerService.currentSession.set(session);
                }
                this.closeCreateModal();
                this.startPolling(session.id);
            }
        });
    }

    selectCard(value: PokerValue) {
        const session = this.session();
        if (!session || session.status !== 'VOTING') return;

        const myVote = this.myVote();
        const isSameCard = myVote?.value === value;

        // Se clicou no mesmo card, desmarca (remove o voto)
        if (isSameCard) {
            this.selectedCard.set(null);
            // Enviar valor vazio para remover o voto
            this.pokerService.votar({
                sessionId: session.id,
                participantName: this.participantName()!,
                value: ''
            }).subscribe({
                next: () => {
                    this.pokerService.buscarSessao(session.id).subscribe();
                }
            });
        } else {
            // Seleciona novo card
            this.selectedCard.set(value);
            this.pokerService.votar({
                sessionId: session.id,
                participantName: this.participantName()!,
                value
            }).subscribe({
                next: () => {
                    // Disparar animação de bola de papel
                    this.triggerPaperBallAnimation();
                    this.pokerService.buscarSessao(session.id).subscribe();
                }
            });
        }
    }

    /**
     * Dispara animação de bola de papel quando alguém vota.
     */
    private triggerPaperBallAnimation(): void {
        // Posição aleatória de origem (lados da tela)
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const startX = side === 3 ? 0 : side === 1 ? window.innerWidth : Math.random() * window.innerWidth;
        const startY = side === 0 ? 0 : side === 2 ? window.innerHeight : Math.random() * window.innerHeight;
        
        // Posição do card do participante (centro da tela como aproximação)
        const endX = window.innerWidth / 2;
        const endY = window.innerHeight / 2;
        
        this.wsService.sendAnimation(
            'paper-ball',
            this.participantName()!,
            startX,
            startY,
            endX,
            endY
        );
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
        // Posicionar participantes em círculo AO REDOR da mesa (não dentro)
        // Raio maior para ficar ao redor da mesa
        const baseRadius = total <= 4 ? 48 : total <= 6 ? 52 : 55;
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
