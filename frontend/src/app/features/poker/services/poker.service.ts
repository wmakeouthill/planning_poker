import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, interval, switchMap, takeWhile, catchError, of, map } from 'rxjs';
import { PokerSession, Vote, CreateSessionDTO, VoteRequestDTO, PageResponse } from '../models/poker.model';

@Injectable({ providedIn: 'root' })
export class PokerService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = 'http://localhost:8080/api/v1/poker';

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
                    this.currentSession.set({
                        ...session,
                        votes: [],
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

    buscarSessao(id: number): Observable<PokerSession> {
        const participant = this.participantName();

        const options: { params?: { participant: string } } = {};
        if (participant) {
            options.params = { participant };
        }

        return this.http.get<PokerSession>(`${this.baseUrl}/sessions/${id}`, options).pipe(
            tap((session) => {
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
                    // Converter para formato esperado se necessário
                    const formattedSession: PokerSession = {
                        id: session.id,
                        name: session.name,
                        status: session.status,
                        storyId: session.storyId || null,
                        storyTitle: session.storyTitle || null,
                        votes: session.votes || [],
                        averageVote: session.averageVote || null,
                        createdAt: session.createdAt,
                        revealedAt: session.revealedAt || null,
                        createdBy: session.createdBy
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
        localStorage.setItem('poker_participant_name', name);
    }

    loadParticipantName(): void {
        const saved = localStorage.getItem('poker_participant_name');
        if (saved) {
            this.participantName.set(saved);
        }
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
