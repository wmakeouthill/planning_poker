import { Component, inject, OnInit, OnDestroy, signal, computed, effect, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PokerService } from '../../services/poker.service';
import { PokerWebSocketService } from '../../services/poker-websocket.service';
import { POKER_VALUES, PokerValue, Vote, getVotingValues, SessionMode } from '../../models/poker.model';
import { ParticipantCardComponent } from '../../components/participant-card/participant-card.component';
import { MasterPanelComponent } from '../../components/master-panel/master-panel.component';
import { TableCenterComponent } from '../../components/table-center/table-center.component';
import { VoteAnimationComponent } from '../../components/vote-animation/vote-animation.component';
import { InviteLinkComponent } from '../../components/invite-link/invite-link.component';
import { ProgressListComponent } from '../../components/progress-list/progress-list.component';
import { EmojiCarouselComponent } from '../../components/emoji-carousel/emoji-carousel.component';
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
        InviteLinkComponent,
        ProgressListComponent,
        EmojiCarouselComponent
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

    // ViewChild para acessar componente de animação diretamente
    private readonly voteAnimation = viewChild(VoteAnimationComponent);

    readonly POKER_VALUES = POKER_VALUES;
    readonly session = this.pokerService.currentSession;
    readonly participantName = this.pokerService.participantName;
    readonly loading = this.pokerService.loading;

    // Valores de votação baseados no modo da sessão
    readonly votingValues = computed(() => {
        const session = this.session();
        if (!session) return POKER_VALUES;
        return getVotingValues(session.mode);
    });

    readonly inviteUrl = computed(() => {
        const session = this.session();
        const code = session?.inviteCode;
        return code ? `${window.location.origin}/poker/join/${code}` : null;
    });

    readonly selectedCard = signal<string | null>(null);
    readonly selectedEmoji = signal<string>('🗞️');
    readonly showJoinModal = signal(false);
    readonly showCreateModal = signal(false);
    readonly newSessionName = signal('');
    readonly tempName = signal('');
    readonly selectedMode = signal<SessionMode>('EFFORT_ESTIMATION');

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
        const votes = session.votes || [];
        if (!Array.isArray(votes) || votes.length === 0) return 0;
        // Contar apenas votos que foram realmente dados (hasVoted = true e value não está vazio)
        const count = votes.filter(v => v && v.hasVoted && v.value && typeof v.value === 'string' && v.value.trim() !== '').length;
        return count;
    });

    readonly totalParticipants = computed(() => {
        const session = this.session();
        if (!session) return 0;
        const votes = session.votes || [];
        if (!Array.isArray(votes)) return 0;
        // Contar todos os participantes que entraram na sessão (têm um voto registrado)
        // Um participante entra quando cria um voto (mesmo que vazio)
        return votes.length;
    });

    // Computed para verificar se há participantes
    readonly hasParticipants = computed(() => {
        const session = this.session();
        if (!session) return false;
        // Verificar se há votos e se o array não está vazio
        const hasVotes = session.votes && Array.isArray(session.votes) && session.votes.length > 0;
        return hasVotes;
    });

    // Nome formatado do modo do jogo
    readonly sessionModeName = computed(() => {
        const session = this.session();
        if (!session) return '';
        return session.mode === 'PRIORITY_VOTING' ? 'Votação de Prioridade' : 'Estimativa de Esforço';
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
                    this.selectedCard.set(myVote.value);
                } else if (!myVote?.hasVoted) {
                    this.selectedCard.set(null);
                }
            } else {
                this.selectedCard.set(null);
            }
        });

        // Effect para sincronizar atualizações do WebSocket com a sessão
        effect(() => {
            const wsUpdate = this.wsService.sessionUpdate();
            if (wsUpdate) {
                // Atualizar sessão quando receber atualização via WebSocket
                this.pokerService.currentSession.set(wsUpdate);
            }
        });

        // Effect para disparar animações quando receber evento via WebSocket
        effect(() => {
            const animationEvent = this.wsService.animationEvent();
            if (animationEvent && animationEvent.participantName !== this.participantName()) {
                // Não disparar animação do próprio usuário (já foi disparada localmente)
                const animationComponent = this.voteAnimation();
                if (animationComponent) {
                    if (animationEvent.type === 'emoji' && animationEvent.emoji) {
                        animationComponent.throwEmoji(
                            animationEvent.emoji,
                            animationEvent.startX,
                            animationEvent.startY,
                            animationEvent.endX,
                            animationEvent.endY
                        );
                    } else if (animationEvent.type === 'paper-ball') {
                        animationComponent.throwPaperBall(
                            animationEvent.startX,
                            animationEvent.startY,
                            animationEvent.endX,
                            animationEvent.endY
                        );
                    }
                }
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
        // Carregar sessão para verificar se o usuário já tem apelido persistido
        this.pokerService.buscarSessao(sessionId).subscribe({
            next: (session) => {
                // Se não tem apelido persistido na sessão, pedir ao usuário
                // Sempre pedir apelido quando entrar em uma sessão nova
                if (!session.participantApelido || session.participantApelido.trim() === '') {
                    // Limpar apelido do localStorage para forçar pedir novo apelido para esta sessão
                    this.pokerService.participantName.set('');
                    localStorage.removeItem('poker_participant_name');
                    this.showJoinModal.set(true);
                    return;
                }

                // Se tem apelido persistido, usar ele
                if (session.participantApelido) {
                    this.pokerService.setParticipantName(session.participantApelido);
                }

                // A sessão já foi atualizada no serviço, então o inviteUrl já deve estar disponível
                const name = this.participantName();
                // Verificar se o participante já está na sessão
                // Garantir que votes existe e é um array
                const votes = session.votes || [];
                const isInSession = votes.some(v => v.participantName === name);
                if (!isInSession && name) {
                    // Criar voto vazio para o participante aparecer na mesa
                    this.pokerService.votar({
                        sessionId: session.id,
                        participantName: name,
                        value: ''
                    }).subscribe({
                        next: () => {
                            // Recarregar sessão para ter todos os participantes atualizados
                            this.pokerService.buscarSessao(session.id).subscribe({
                                next: (updatedSession) => {
                                    // Garantir que a sessão foi atualizada com os votos
                                    if (updatedSession && updatedSession.votes) {
                                        this.startPolling(session.id);
                                    } else {
                                        // Se não tem votos, tentar novamente após um pequeno delay
                                        setTimeout(() => {
                                            this.pokerService.buscarSessao(session.id).subscribe({
                                                next: () => this.startPolling(session.id)
                                            });
                                        }, 500);
                                    }
                                }
                            });
                        },
                        error: () => {
                            // Se falhar ao votar, ainda tenta iniciar polling
                            this.startPolling(session.id);
                        }
                    });
                } else {
                    // Já está na sessão, iniciar polling imediatamente
                    this.startPolling(session.id);
                }
            },
            error: (error) => {
                console.error('Erro ao carregar sessão:', error);
                // Se não conseguir carregar, mostrar modal para pedir apelido
                this.showJoinModal.set(true);
            }
        });
    }

    private carregarSessaoAtiva(): void {
        // Buscar sessão ativa para verificar se o usuário já tem apelido persistido
        this.pokerService.buscarSessaoAtiva().subscribe({
            next: (session) => {
                if (session) {
                    // Se não tem apelido persistido na sessão, pedir ao usuário
                    // Sempre pedir apelido quando entrar em uma sessão nova
                    if (!session.participantApelido || session.participantApelido.trim() === '') {
                        // Limpar apelido do localStorage para forçar pedir novo apelido para esta sessão
                        this.pokerService.participantName.set('');
                        localStorage.removeItem('poker_participant_name');
                        this.showJoinModal.set(true);
                        return;
                    }

                    // Se tem apelido persistido, usar ele
                    if (session.participantApelido) {
                        this.pokerService.setParticipantName(session.participantApelido);
                    }

                    const name = this.participantName();
                    // Verificar se o participante já está na sessão
                    // Garantir que votes existe e é um array
                    const votes = session.votes || [];
                    const isInSession = votes.some(v => v.participantName === name);
                    if (!isInSession && name) {
                        // Criar voto vazio para o participante aparecer na mesa
                        this.pokerService.votar({
                            sessionId: session.id,
                            participantName: name,
                            value: ''
                        }).subscribe({
                            next: () => {
                                // Recarregar sessão para ter todos os participantes atualizados
                                this.pokerService.buscarSessao(session.id).subscribe({
                                    next: (updatedSession) => {
                                        // Garantir que a sessão foi atualizada com os votos
                                        if (updatedSession && updatedSession.votes) {
                                            this.startPolling(session.id);
                                        } else {
                                            // Se não tem votos, tentar novamente após um pequeno delay
                                            setTimeout(() => {
                                                this.pokerService.buscarSessao(session.id).subscribe({
                                                    next: () => this.startPolling(session.id)
                                                });
                                            }, 500);
                                        }
                                    }
                                });
                            },
                            error: () => {
                                // Se falhar ao votar, ainda tenta iniciar polling
                                this.startPolling(session.id);
                            }
                        });
                    } else {
                        // Já está na sessão, iniciar polling imediatamente
                        this.startPolling(session.id);
                    }
                }
            },
            error: () => {
                // Erro silencioso - não há sessão ativa é um caso normal
            }
        });
    }

    ngOnDestroy() {
        this.pollingSubscription?.unsubscribe();
        this.wsService.disconnect();
    }

    joinSession() {
        const name = this.tempName().trim();
        if (!name) return;

        // Não salvar no localStorage global - cada sessão tem seu próprio apelido
        // Apenas definir no signal para usar nesta sessão
        this.pokerService.participantName.set(name);
        this.showJoinModal.set(false);

        // Verificar se há um ID na rota
        const sessionId = this.route.snapshot.paramMap.get('id');

        // Se estava criando uma sessão, criar agora com o apelido
        const sessionNameToCreate = this.newSessionName();
        if (sessionNameToCreate && sessionNameToCreate.trim() !== '') {
            // Criar sessão e depois votar para persistir o apelido
            const mode = this.selectedMode();
            this.pokerService.criarSessao({
                name: sessionNameToCreate,
                mode: mode || 'EFFORT_ESTIMATION'
            }).subscribe({
                next: (session) => {
                    // Marcar o criador da sessão
                    if (session && name) {
                        session.createdBy = name;
                        this.pokerService.currentSession.set(session);
                    }
                    this.newSessionName.set('');

                    // Votar com valor vazio para persistir o apelido na sessão
                    this.pokerService.votar({
                        sessionId: session.id,
                        participantName: name,
                        value: ''
                    }).subscribe({
                        next: () => {
                            // Recarregar sessão para ter o apelido persistido
                            this.pokerService.buscarSessao(session.id).subscribe({
                                next: () => {
                                    this.startPolling(session.id);
                                }
                            });
                        },
                        error: () => {
                            // Mesmo se falhar, iniciar polling
                            this.startPolling(session.id);
                        }
                    });
                }
            });
            return;
        }

        if (sessionId) {
            // Carregar sessão específica pelo ID e adicionar participante
            this.pokerService.buscarSessao(Number(sessionId)).subscribe({
                next: (session) => {
                    // Verificar se o participante já está na sessão
                    const isInSession = session.votes.some(v => v.participantName === name);
                    if (!isInSession) {
                        // Criar voto vazio para o participante aparecer na mesa
                        this.pokerService.votar({
                            sessionId: session.id,
                            participantName: name,
                            value: ''
                        }).subscribe({
                            next: () => {
                                // Recarregar sessão para ter todos os participantes atualizados
                                this.pokerService.buscarSessao(session.id).subscribe({
                                    next: () => {
                                        this.startPolling(session.id);
                                    }
                                });
                            },
                            error: () => {
                                // Mesmo se falhar, iniciar polling
                                this.startPolling(session.id);
                            }
                        });
                    } else {
                        // Já está na sessão, apenas iniciar polling
                        this.startPolling(session.id);
                    }
                },
                error: () => {
                    // Se não encontrar sessão, tentar buscar sessão ativa
                    this.carregarSessaoAtiva();
                }
            });
        } else {
            // Buscar sessão ativa
            this.pokerService.buscarSessaoAtiva().subscribe({
                next: (session) => {
                    if (session) {
                        // Verificar se o participante já está na sessão
                        const isInSession = session.votes.some(v => v.participantName === name);
                        if (!isInSession) {
                            // Criar voto vazio para o participante aparecer na mesa
                            this.pokerService.votar({
                                sessionId: session.id,
                                participantName: name,
                                value: ''
                            }).subscribe({
                                next: () => {
                                    // Recarregar sessão para ter todos os participantes atualizados
                                    this.pokerService.buscarSessao(session.id).subscribe({
                                        next: () => {
                                            this.startPolling(session.id);
                                        }
                                    });
                                },
                                error: () => {
                                    // Mesmo se falhar, iniciar polling
                                    this.startPolling(session.id);
                                }
                            });
                        } else {
                            // Já está na sessão, apenas iniciar polling
                            this.startPolling(session.id);
                        }
                    }
                }
            });
        }
    }

    openCreateModal() {
        this.showCreateModal.set(true);
        this.newSessionName.set('');
        this.selectedMode.set('EFFORT_ESTIMATION');
    }

    closeCreateModal() {
        this.showCreateModal.set(false);
    }

    createSession() {
        const name = this.newSessionName().trim() || 'Nova Sessão';

        // Sempre pedir apelido ao criar uma sessão nova (mesmo que já tenha em outra sessão)
        // Fechar modal de criação e abrir modal de apelido
        this.closeCreateModal();
        this.showJoinModal.set(true);
        // Salvar o nome da sessão temporariamente para criar depois
        this.newSessionName.set(name);
    }

    selectCard(value: string) {
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
        const session = this.session();
        if (!session) return;

        // Posição aleatória de origem (lados da tela)
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const startX = side === 3 ? 0 : side === 1 ? window.innerWidth : Math.random() * window.innerWidth;
        const startY = side === 0 ? 0 : side === 2 ? window.innerHeight : Math.random() * window.innerHeight;

        // Posição do card do participante (centro da tela como aproximação)
        const endX = window.innerWidth / 2;
        const endY = window.innerHeight / 2;

        // Disparar animação localmente primeiro
        const animationComponent = this.voteAnimation();
        if (animationComponent) {
            animationComponent.throwPaperBall(startX, startY, endX, endY);
        }

        // Enviar via HTTP (será propagado via WebSocket pelo backend para outros usuários)
        this.wsService.sendAnimation({
            sessionId: session.id,
            type: 'paper-ball',
            participantName: this.participantName()!,
            startX,
            startY,
            endX,
            endY
        }).catch(error => {
            console.error('Erro ao enviar animação:', error);
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
        // Buscar sessão imediatamente antes de conectar WebSocket
        this.pokerService.buscarSessao(sessionId).subscribe({
            next: (session) => {
                // Garantir que a sessão tem votos
                if (!session.votes) {
                    session.votes = [];
                }
                // Atualizar sessão imediatamente para mostrar dados atuais
                this.pokerService.currentSession.set(session);

                // Conectar ao WebSocket para receber atualizações em tempo real
                this.wsService.connect(sessionId);

                // Fallback: Iniciar polling apenas se WebSocket não estiver disponível
                // (será usado como fallback se WebSocket falhar)
                this.pollingSubscription?.unsubscribe();
                this.pollingSubscription = this.pokerService.startPolling(sessionId).subscribe({
                    next: (updatedSession) => {
                        // Só atualizar via polling se não recebeu atualização via WebSocket recentemente
                        // Isso evita conflitos entre polling e WebSocket
                        const wsUpdate = this.wsService.sessionUpdate();
                        if (!wsUpdate || wsUpdate.id !== updatedSession.id) {
                            if (!updatedSession.votes) {
                                updatedSession.votes = [];
                            }
                            // Verificar se houve mudança antes de atualizar
                            const currentSession = this.session();
                            if (!currentSession ||
                                currentSession.votes.length !== updatedSession.votes.length ||
                                currentSession.status !== updatedSession.status) {
                                this.pokerService.currentSession.set(updatedSession);
                            }
                        }

                        // Se a sessão foi fechada, parar polling e desconectar WebSocket
                        if (updatedSession.status === 'CLOSED') {
                            this.pollingSubscription?.unsubscribe();
                            this.wsService.disconnect();
                        }
                    },
                    error: (error) => {
                        console.error('Erro no polling (fallback):', error);
                        // Não parar polling em caso de erro - continuar tentando como fallback
                    }
                });
            },
            error: (error) => {
                console.error('Erro ao carregar sessão inicial:', error);
            }
        });
    }

    getCardPosition(index: number, total: number): { top: string; left: string; rotation: string; namePosition: 'top' | 'bottom' } {
        const session = this.session();
        const status = session?.status;

        // Se os votos foram revelados, posicionar em fileira horizontal embaixo da mesa
        if (status === 'REVEALED' || status === 'CLOSED') {
            return this.getRevealedCardPosition(index, total);
        }

        // Durante votação, posicionar em círculo ao redor da mesa
        return this.getVotingCardPosition(index, total);
    }

    private getVotingCardPosition(index: number, total: number): { top: string; left: string; rotation: string; namePosition: 'top' | 'bottom' } {
        // Posicionar participantes em círculo ao redor da mesa
        // O posicionamento é relativo à mesa (0% = borda esquerda/topo, 100% = borda direita/baixo)
        // Valores > 100% ou < 0% ficam fora da mesa
        
        // Raio base para ficar ao redor da mesa (fora dela)
        let baseRadiusX = 65; // Raio horizontal (%)
        let baseRadiusY = 75; // Raio vertical (%)

        // Ajustar raio baseado no número de participantes
        if (total <= 2) {
            baseRadiusX = 60;
            baseRadiusY = 70;
        } else if (total <= 4) {
            baseRadiusX = 62;
            baseRadiusY = 72;
        } else if (total <= 6) {
            baseRadiusX = 65;
            baseRadiusY = 75;
        } else if (total <= 8) {
            baseRadiusX = 68;
            baseRadiusY = 78;
        } else {
            baseRadiusX = 70;
            baseRadiusY = 80;
        }

        // Calcular ângulo uniformemente distribuído
        // Começar do topo (-Math.PI/2) e distribuir uniformemente
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2;

        // Posicionar ao redor do centro da mesa (50%, 50%)
        const x = 50 + baseRadiusX * Math.cos(angle);
        const y = 50 + baseRadiusY * Math.sin(angle);

        // Determinar posição do nome:
        // - Se a carta está na metade INFERIOR (y > 50%), nome aparece EM CIMA (top)
        // - Se a carta está na metade SUPERIOR (y <= 50%), nome aparece EM BAIXO (bottom)
        const namePosition: 'top' | 'bottom' = y > 50 ? 'top' : 'bottom';

        return {
            top: `${y}%`,
            left: `${x}%`,
            rotation: `${(angle * 180 / Math.PI) + 90}deg`,
            namePosition
        };
    }

    private getRevealedCardPosition(index: number, total: number): { top: string; left: string; rotation: string; namePosition: 'top' | 'bottom' } {
        // 'total' já é o número de votos revelados passado pelo template
        if (total === 0) {
            // Se não há votos revelados, usar posição padrão
            return this.getVotingCardPosition(index, total);
        }

        if (typeof window === 'undefined') {
            // Fallback se window não estiver disponível
            return {
                top: '78%',
                left: `${10 + (index * 12)}%`,
                rotation: '0deg',
                namePosition: 'top'
            };
        }

        // Tamanho real da carta em pixels (baseado no CSS do participant-card)
        // CSS define: width: 70px (desktop), 50px (mobile < 768px), 42px (mobile < 480px)
        let cardWidth = 70; // Desktop padrão
        if (window.innerWidth < 480) {
            cardWidth = 42;
        } else if (window.innerWidth < 768) {
            cardWidth = 50;
        }

        // Gap maior e mais visível entre cartas - AUMENTADO para garantir espaço
        const gap = window.innerWidth < 768 ? 20 : 25; // Gap maior: 20px mobile, 25px desktop

        // Calcular espaço disponível considerando o container .poker-table-container
        // O container tem padding de 2rem (32px) de cada lado no desktop, 1rem (16px) no mobile
        const containerPadding = window.innerWidth < 768 ? 16 : 32;
        const containerPaddingTotal = containerPadding * 2; // padding left + right
        const containerPaddingLeft = containerPadding; // padding de um lado apenas
        const availableWidth = window.innerWidth - containerPaddingTotal;

        // Calcular quantas cartas cabem por fileira
        // Espaço necessário por carta = largura da carta + gap
        const spacePerCard = cardWidth + gap;
        const cardsPerRow = Math.floor(availableWidth / spacePerCard);

        // Garantir pelo menos 1 carta por fileira e no máximo 10 por fileira
        const actualCardsPerRow = Math.max(1, Math.min(cardsPerRow, 10));

        // Calcular em qual fileira está esta carta
        const row = Math.floor(index / actualCardsPerRow);
        const positionInRow = index % actualCardsPerRow;
        const cardsInThisRow = Math.min(actualCardsPerRow, total - (row * actualCardsPerRow));

        // Calcular posição horizontal
        // Centralizar o grupo de cartas na tela (considerando o container)
        const totalCardsWidth = (cardsInThisRow * cardWidth) + (gap * (cardsInThisRow - 1));
        const startLeftPx = containerPaddingLeft + ((availableWidth - totalCardsWidth) / 2);

        // Posição left desta carta em pixels
        // IMPORTANTE: A carta está centralizada com transform: translate(-50%, -50%)
        // Então o left deve ser o centro da carta
        // startLeftPx é a posição da borda esquerda da primeira carta
        // Para cada carta, adicionamos: (cardWidth + gap) * positionInRow para chegar na borda esquerda
        // Depois adicionamos cardWidth/2 para chegar no centro
        const cardLeftPx = startLeftPx + (positionInRow * (cardWidth + gap)) + (cardWidth / 2);
        const leftPercent = (cardLeftPx / window.innerWidth) * 100;

        // Debug temporário - remover depois
        // console.log(`Card ${index}: left=${leftPercent.toFixed(2)}%, gap=${gap}px, cardWidth=${cardWidth}px, posInRow=${positionInRow}, cardsInRow=${cardsInThisRow}`);

        // Posicionar mais abaixo da mesa
        let topPercent = 78;
        const screenHeight = window.innerHeight;

        if (screenHeight < 600) {
            topPercent = 72;
        } else if (screenHeight < 800) {
            topPercent = 75;
        } else if (screenHeight > 1200) {
            topPercent = 82;
        }

        // Adicionar offset para fileiras adicionais
        let rowSpacing = 14; // Espaçamento padrão entre fileiras (em %)
        if (screenHeight < 600) {
            rowSpacing = 12;
        } else if (screenHeight < 800) {
            rowSpacing = 13;
        } else if (screenHeight > 1200) {
            rowSpacing = 16;
        }
        topPercent += row * rowSpacing;

        return {
            top: `${topPercent}%`,
            left: `${leftPercent}%`,
            rotation: '0deg',
            namePosition: 'top'
        };
    }

    /**
     * Atualiza o emoji selecionado no carrossel.
     */
    onEmojiSelected(emoji: string): void {
        this.selectedEmoji.set(emoji);
    }

    /**
     * Dispara animação de emoji ao clicar em uma carta de participante.
     */
    onParticipantCardClick(event: { vote: Vote; element: HTMLElement }): void {
        // Não arremessar emoji em si mesmo
        if (event.vote.participantName === this.participantName()) {
            return;
        }

        const session = this.session();
        if (!session) return;

        // Obter posição do card clicado
        // O event.element é o card-flip-container, mas precisamos do participant-card (pai)
        // que tem o posicionamento absoluto correto com transform: translate(-50%, -50%)
        const cardContainer = event.element.closest('.participant-card') as HTMLElement;
        const targetElement = cardContainer || event.element;
        const rect = targetElement.getBoundingClientRect();
        // O centro do elemento (considerando que participant-card usa translate(-50%, -50%))
        const endX = rect.left + rect.width / 2;
        const endY = rect.top + rect.height / 2;

        // Posição aleatória de origem (lados da tela)
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let startX: number;
        let startY: number;

        switch (side) {
            case 0: // top
                startX = Math.random() * window.innerWidth;
                startY = -50;
                break;
            case 1: // right
                startX = window.innerWidth + 50;
                startY = Math.random() * window.innerHeight;
                break;
            case 2: // bottom
                startX = Math.random() * window.innerWidth;
                startY = window.innerHeight + 50;
                break;
            default: // left
                startX = -50;
                startY = Math.random() * window.innerHeight;
        }

        // Disparar animação localmente primeiro
        const animationComponent = this.voteAnimation();
        if (animationComponent) {
            animationComponent.throwEmoji(this.selectedEmoji(), startX, startY, endX, endY);
        }

        // Enviar via HTTP (será propagado via WebSocket pelo backend para outros usuários)
        this.wsService.sendAnimation({
            sessionId: session.id,
            type: 'emoji',
            participantName: this.participantName()!,
            startX,
            startY,
            endX,
            endY,
            targetCard: event.vote.value,
            emoji: this.selectedEmoji()
        }).catch(error => {
            console.error('Erro ao enviar animação:', error);
        });
    }

    /**
     * Dispara animação de emoji ao clicar em uma carta revelada (nova fileira).
     */
    onRevealedCardClick(event: MouseEvent, vote: Vote): void {
        // Não arremessar emoji em si mesmo
        if (vote.participantName === this.participantName()) {
            return;
        }

        const session = this.session();
        if (!session) return;

        // Obter posição do card clicado
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const endX = rect.left + rect.width / 2;
        const endY = rect.top + rect.height / 2;

        // Posição aleatória de origem (lados da tela)
        const side = Math.floor(Math.random() * 4);
        let startX: number;
        let startY: number;

        switch (side) {
            case 0: // top
                startX = Math.random() * window.innerWidth;
                startY = -50;
                break;
            case 1: // right
                startX = window.innerWidth + 50;
                startY = Math.random() * window.innerHeight;
                break;
            case 2: // bottom
                startX = Math.random() * window.innerWidth;
                startY = window.innerHeight + 50;
                break;
            default: // left
                startX = -50;
                startY = Math.random() * window.innerHeight;
        }

        // Disparar animação localmente primeiro
        const animationComponent = this.voteAnimation();
        if (animationComponent) {
            animationComponent.throwEmoji(this.selectedEmoji(), startX, startY, endX, endY);
        }

        // Enviar via HTTP
        this.wsService.sendAnimation({
            sessionId: session.id,
            type: 'emoji',
            participantName: this.participantName()!,
            startX,
            startY,
            endX,
            endY,
            targetCard: vote.value,
            emoji: this.selectedEmoji()
        }).catch(error => {
            console.error('Erro ao enviar animação:', error);
        });
    }
}
