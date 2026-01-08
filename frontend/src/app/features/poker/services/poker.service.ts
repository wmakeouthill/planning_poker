import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, interval, switchMap, takeWhile, catchError, of, map } from 'rxjs';
import { PokerSession, Vote, CreateSessionDTO, VoteRequestDTO, PageResponse } from '../models/poker.model';
import { getApiUrl } from '../../../core/utils/api-url';

export interface JoinSessionResponseDTO {
    sessionId: number;
    apelido?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PokerService {
    private readonly http = inject(HttpClient);

    private get baseUrl(): string {
        return `${getApiUrl()}/v1/poker`;
    }

    // State usando Signals
    readonly currentSession = signal<PokerSession | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly participantName = signal<string>('');

    criarSessao(dto: CreateSessionDTO): Observable<PokerSession> {
        this.loading.set(true);

        return this.http.post<PokerSession>(`${this.baseUrl}/sessions`, dto).pipe(
            tap({
                next: (session) => {
                    // Garantir que votes sempre seja um array
                    const votes = session.votes || [];
                    this.currentSession.set({
                        ...session,
                        votes: votes,
                        averageVote: null
                    } as PokerSession);
                    this.loading.set(false);
                },
                error: () => {
                    this.error.set('Erro ao criar sessão');
                    this.loading.set(false);
                }
            })
        );
    }

    entrarPorInviteCode(inviteCode: string): Observable<JoinSessionResponseDTO> {
        return this.http.post<JoinSessionResponseDTO>(`${this.baseUrl}/sessions/join/${inviteCode}`, {}).pipe(
            tap((response) => {
                // Se o backend retornou um apelido, usar ele (persistido na sessão)
                if (response.apelido && response.apelido.trim() !== '') {
                    this.setParticipantName(response.apelido);
                }
            })
        );
    }

    buscarSessao(id: number): Observable<PokerSession> {
        const participant = this.participantName();

        const options: { params?: { participant: string } } = {};
        if (participant) {
            options.params = { participant };
        }

        return this.http.get<PokerSession>(`${this.baseUrl}/sessions/${id}`, options).pipe(
            tap((session) => {
                // Garantir que votes sempre seja um array
                if (!session.votes) {
                    session.votes = [];
                }
                // Se o backend retornou um apelido, usar ele (persistido na sessão)
                if (session.participantApelido && session.participantApelido.trim() !== '') {
                    this.setParticipantName(session.participantApelido);
                }
                this.currentSession.set(session);
            })
        );
    }

    buscarSessaoAtiva(): Observable<PokerSession | null> {
        return this.http.get<PokerSession>(`${this.baseUrl}/sessions/active`, {
            observe: 'response',
            // Não lançar erro para status 204
            reportProgress: false
        }).pipe(
            // Mapear response para body ou null
            map((response) => {
                if (response.status === 204 || !response.body) {
                    this.currentSession.set(null);
                    return null;
                }

                const session = response.body!;
                if (session && session.id) {
                    // Garantir que votes sempre seja um array
                    const votes = session.votes || [];
                    // Se o backend retornou um apelido, usar ele (persistido na sessão)
                    if (session.participantApelido && session.participantApelido.trim() !== '') {
                        this.setParticipantName(session.participantApelido);
                    }
                    // Converter para formato esperado se necessário
                    const formattedSession: PokerSession = {
                        id: session.id,
                        name: session.name,
                        status: session.status,
                        mode: session.mode || 'EFFORT_ESTIMATION',
                        storyId: session.storyId || null,
                        storyTitle: session.storyTitle || null,
                        inviteCode: session.inviteCode || null,
                        votes: votes,
                        averageVote: session.averageVote || null,
                        createdAt: session.createdAt,
                        revealedAt: session.revealedAt || null,
                        createdBy: session.createdBy,
                        participantApelido: session.participantApelido || null
                    };
                    this.currentSession.set(formattedSession);
                    return formattedSession;
                } else {
                    this.currentSession.set(null);
                    return null;
                }
            }),
            // Tratar erros silenciosamente (não há sessão ativa é um caso normal)
            catchError((error: any) => {
                // Sempre retornar null para erros - não há sessão ativa é um caso normal
                this.currentSession.set(null);
                // Não propagar o erro para evitar logs no console
                return of(null);
            })
        );
    }

    votar(dto: VoteRequestDTO): Observable<Vote> {
        return this.http.post<Vote>(`${this.baseUrl}/vote`, dto).pipe(
            tap((vote) => {
                // Atualiza a sessão após votar
                const session = this.currentSession();
                if (session) {
                    const hasVoted = !!(dto.value && dto.value.trim() !== '');

                    // Atualiza o voto na sessão local imediatamente
                    let votes: Vote[] = session.votes.map(v =>
                        v.participantName === dto.participantName
                            ? { ...v, value: dto.value || '', hasVoted: hasVoted }
                            : v
                    );

                    // Se não existe voto para este participante, adiciona
                    if (!votes.some(v => v.participantName === dto.participantName)) {
                        votes.push({
                            id: vote.id,
                            participantName: dto.participantName,
                            value: dto.value || '',
                            revealed: false,
                            hasVoted: hasVoted
                        });
                    }

                    this.currentSession.set({
                        ...session,
                        votes
                    });

                    // Busca atualização completa do servidor
                    this.buscarSessao(session.id).subscribe();
                }
            })
        );
    }

    revelarVotos(sessionId: number): Observable<PokerSession> {
        return this.http.post<PokerSession>(`${this.baseUrl}/sessions/${sessionId}/reveal`, {}).pipe(
            tap((session) => {
                this.currentSession.set(session);
                // Busca atualização completa
                this.buscarSessao(sessionId).subscribe();
            })
        );
    }

    resetarVotos(sessionId: number): Observable<PokerSession> {
        return this.http.post<PokerSession>(`${this.baseUrl}/sessions/${sessionId}/reset`, {}).pipe(
            tap((session) => {
                this.currentSession.set(session);
                // Busca atualização completa
                this.buscarSessao(sessionId).subscribe();
            })
        );
    }

    listarHistorico(page: number = 0, size: number = 10, status?: 'VOTING' | 'REVEALED' | 'CLOSED'): Observable<PageResponse<PokerSession>> {
        this.loading.set(true);
        let url = `${this.baseUrl}/sessions/history?page=${page}&size=${size}`;
        if (status) {
            url += `&status=${status}`;
        }

        return this.http.get<PageResponse<PokerSession>>(url).pipe(
            tap({
                next: () => this.loading.set(false),
                error: () => this.loading.set(false)
            })
        );
    }

    fecharSessao(sessionId: number): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/sessions/${sessionId}/close`, {}).pipe(
            tap(() => {
                this.currentSession.set(null);
            })
        );
    }

    setParticipantName(name: string): void {
        this.participantName.set(name);
        // Não salvar no localStorage - cada sessão tem seu próprio apelido persistido
        // O apelido será recuperado do backend quando entrar na sessão
    }

    loadParticipantName(): void {
        // Não carregar do localStorage - o apelido será recuperado do backend
        // quando entrar na sessão específica
    }

    // Polling para atualização em tempo real
    startPolling(sessionId: number, intervalMs = 3000): Observable<PokerSession> {
        return interval(intervalMs).pipe(
            switchMap(() => this.buscarSessao(sessionId)),
            takeWhile((session) => {
                // Continuar polling enquanto a sessão não estiver fechada
                return session.status !== 'CLOSED';
            }, true) // Incluir último valor antes de parar
        );
    }
}
