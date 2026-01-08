import { Injectable, signal, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { PokerSession } from '../models/poker.model';
import { getApiUrl } from '../../../core/utils/api-url';

// Importação do SockJS - o polyfill global está no index.html
declare const SockJS: any;

export interface PokerSessionUpdate {
    id: number;
    name: string;
    status: 'VOTING' | 'REVEALED' | 'CLOSED';
    mode?: 'EFFORT_ESTIMATION' | 'PRIORITY_VOTING';
    votes: Array<{
        id: number;
        participantName: string;
        value: string;
        revealed: boolean;
        hasVoted: boolean;
    }>;
    averageVote: number | null;
    revealedAt: string | null;
    eventType: 'VOTE' | 'REVEAL' | 'RESET' | 'JOIN' | 'CLOSED';
    novaSessaoId: number | null; // ID da nova sessão quando nova rodada é criada
}

export interface AnimationEvent {
    id: string;
    type: 'paper-ball' | 'emoji';
    sessionId: number;
    participantName: string;
    targetCard?: string;
    emoji?: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    timestamp: number;
}

/**
 * Serviço WebSocket para comunicação em tempo real usando STOMP over SockJS.
 * Conecta ao backend Spring Boot via WebSocket para receber atualizações em tempo real.
 */
@Injectable({ providedIn: 'root' })
export class PokerWebSocketService implements OnDestroy {
    private client: Client | null = null;
    private connectedSessionId: number | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private _beforeUnloadListener?: () => void;

    // Signals para eventos em tempo real
    readonly sessionUpdate = signal<PokerSession | null>(null);
    readonly animationEvent = signal<AnimationEvent | null>(null);
    readonly isConnected = signal<boolean>(false);
    readonly connectionError = signal<string | null>(null);

    constructor() {
        // Nada no construtor - inicialização será feita quando necessário
    }

    /**
     * Conecta ao WebSocket e inscreve-se nas atualizações da sessão.
     */
    connect(sessionId: number): void {
        if (typeof window === 'undefined') {
            console.warn('[WebSocket] Window não disponível, pulando conexão');
            return;
        }

        if (this.client?.connected && this.connectedSessionId === sessionId) {
            // Já está conectado à mesma sessão
            return;
        }

        // Se já está conectado a outra sessão, desconectar primeiro
        if (this.client?.connected) {
            this.disconnect();
        }

        this.connectedSessionId = sessionId;

        // Configurar listener de beforeunload quando conectar pela primeira vez
        if (!this._beforeUnloadListener) {
            this._beforeUnloadListener = () => {
                this.disconnect();
            };
            window.addEventListener('beforeunload', this._beforeUnloadListener);
        }

        // Obter URL base da API e converter para WebSocket
        const apiUrl = getApiUrl();
        const wsUrl = this.getWebSocketUrl(apiUrl);

        // Importar SockJS dinamicamente para evitar problemas com polyfills
        import('sockjs-client').then(SockJSModule => {
            const SockJSClass = SockJSModule.default || SockJSModule;

            this.client = new Client({
                webSocketFactory: () => {
                    // Criar instância do SockJS sem credenciais
                    // O WebSocket não precisa de autenticação JWT - a sessão é identificada pelo ID
                    // Isso evita problemas de CORS com Access-Control-Allow-Credentials
                    const options: any = {
                        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
                        withCredentials: false // Não enviar credenciais para evitar problemas de CORS
                    };
                    const sock = new SockJSClass(wsUrl, null, options);
                    return sock as any;
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (str) => {
                    // Log apenas em desenvolvimento
                    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                        console.debug('[STOMP]', str);
                    }
                },
                onConnect: () => {
                    console.log('[WebSocket] Conectado à sessão', sessionId);
                    this.isConnected.set(true);
                    this.connectionError.set(null);
                    this.reconnectAttempts = 0;

                    // Inscrever-se nas atualizações da sessão
                    this.subscribeToSessionUpdates(sessionId);

                    // Inscrever-se nos eventos de animação
                    this.subscribeToAnimations(sessionId);
                },
                onStompError: (frame) => {
                    console.error('[WebSocket] Erro STOMP:', frame);
                    this.connectionError.set(frame.headers['message'] || 'Erro de conexão WebSocket');
                    this.isConnected.set(false);
                },
                onWebSocketClose: () => {
                    console.log('[WebSocket] Desconectado');
                    this.isConnected.set(false);
                    this.connectionError.set('Conexão WebSocket fechada');

                    // Tentar reconectar se não foi uma desconexão manual
                    if (this.connectedSessionId !== null && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        setTimeout(() => {
                            if (this.connectedSessionId !== null) {
                                console.log(`[WebSocket] Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                                this.connect(this.connectedSessionId);
                            }
                        }, 5000);
                    }
                },
                onWebSocketError: (event) => {
                    console.error('[WebSocket] Erro:', event);
                    this.connectionError.set('Erro na conexão WebSocket');
                    this.isConnected.set(false);
                }
            });

            this.client.activate();
        }).catch(error => {
            console.error('[WebSocket] Erro ao carregar SockJS:', error);
            this.connectionError.set('Erro ao carregar biblioteca WebSocket');
        });
    }

    /**
     * Desconecta do WebSocket.
     */
    disconnect(): void {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }
        this.connectedSessionId = null;
        this.isConnected.set(false);
        this.reconnectAttempts = 0;

        // Remover listener de beforeunload se existir
        if (typeof window !== 'undefined' && this._beforeUnloadListener) {
            window.removeEventListener('beforeunload', this._beforeUnloadListener);
            this._beforeUnloadListener = undefined;
        }
    }

    /**
     * Inscreve-se nas atualizações da sessão.
     */
    private subscribeToSessionUpdates(sessionId: number): void {
        if (!this.client?.connected) return;

        const destination = `/topic/poker/session/${sessionId}`;

        this.client.subscribe(destination, (message: IMessage) => {
            try {
                const update: PokerSessionUpdate = JSON.parse(message.body);
                console.log('[WebSocket] Atualização recebida:', update.eventType, update.novaSessaoId ? `(nova sessão: ${update.novaSessaoId})` : '');

                // Converter DTO para PokerSession
                const session: PokerSession = {
                    id: update.id,
                    name: update.name,
                    status: update.status,
                    mode: update.mode || 'EFFORT_ESTIMATION',
                    storyId: null,
                    storyTitle: null,
                    inviteCode: null,
                    votes: update.votes.map(v => ({
                        id: v.id,
                        participantName: v.participantName,
                        value: v.value,
                        revealed: v.revealed,
                        hasVoted: v.hasVoted
                    })),
                    averageVote: update.averageVote,
                    createdAt: '',
                    revealedAt: update.revealedAt,
                    createdBy: undefined,
                    novaSessaoId: update.novaSessaoId
                };

                this.sessionUpdate.set(session);
            } catch (error) {
                console.error('[WebSocket] Erro ao processar atualização:', error);
            }
        });
    }

    /**
     * Inscreve-se nos eventos de animação.
     */
    private subscribeToAnimations(sessionId: number): void {
        if (!this.client?.connected) return;

        const destination = `/topic/poker/session/${sessionId}/animation`;

        this.client.subscribe(destination, (message: IMessage) => {
            try {
                const event: AnimationEvent = JSON.parse(message.body);
                console.log('[WebSocket] Animação recebida:', event.type);

                this.animationEvent.set(event);

                // Limpar após 3 segundos
                setTimeout(() => {
                    if (this.animationEvent()?.id === event.id) {
                        this.animationEvent.set(null);
                    }
                }, 3000);
            } catch (error) {
                console.error('[WebSocket] Erro ao processar animação:', error);
            }
        });
    }

    /**
     * Envia evento de animação via HTTP (será propagado via WebSocket pelo backend).
     */
    async sendAnimation(params: {
        sessionId: number;
        type: 'paper-ball' | 'emoji';
        participantName: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        targetCard?: string;
        emoji?: string;
    }): Promise<void> {
        const { sessionId, type, participantName, startX, startY, endX, endY, targetCard, emoji } = params;
        const animationDto = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            sessionId,
            participantName,
            targetCard: targetCard || null,
            emoji: emoji || null,
            startX,
            startY,
            endX,
            endY,
            timestamp: Date.now()
        };

        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/v1/poker/sessions/${sessionId}/animation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(animationDto)
            });

            if (!response.ok) {
                throw new Error(`Erro ao enviar animação: ${response.statusText}`);
            }
        } catch (error) {
            console.error('[WebSocket] Erro ao enviar animação:', error);
            throw error;
        }
    }

    /**
     * Converte URL da API para URL do WebSocket.
     */
    private getWebSocketUrl(apiUrl: string): string {
        // Se for URL relativa, usar a mesma origem
        if (apiUrl.startsWith('/')) {
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const host = window.location.host;
            return `${protocol}//${host}${apiUrl.replace('/api', '')}/ws/poker`;
        }

        // Se for URL completa, substituir /api por /ws/poker
        return apiUrl.replace('/api', '').replace(/\/$/, '') + '/ws/poker';
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
