import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, interval, switchMap, takeWhile } from 'rxjs';
import { PokerSession, Vote, CreateSessionDTO, VoteRequestDTO } from '../models/poker.model';

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
        return this.http.get<PokerSession>(`${this.baseUrl}/sessions/active`).pipe(
            tap((session) => {
                if (session) {
                    this.currentSession.set(session);
                }
            })
        );
    }

    votar(dto: VoteRequestDTO): Observable<Vote> {
        return this.http.post<Vote>(`${this.baseUrl}/vote`, dto).pipe(
            tap(() => {
                // Atualiza a sessão após votar
                if (this.currentSession()) {
                    this.buscarSessao(this.currentSession()!.id).subscribe();
                }
            })
        );
    }

    revelarVotos(sessionId: number): Observable<PokerSession> {
        return this.http.post<PokerSession>(`${this.baseUrl}/sessions/${sessionId}/reveal`, {}).pipe(
            tap(() => {
                this.buscarSessao(sessionId).subscribe();
            })
        );
    }

    resetarVotos(sessionId: number): Observable<PokerSession> {
        return this.http.post<PokerSession>(`${this.baseUrl}/sessions/${sessionId}/reset`, {}).pipe(
            tap(() => {
                this.buscarSessao(sessionId).subscribe();
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

    // Polling para atualização em tempo real (simplificado)
    startPolling(sessionId: number, intervalMs = 3000): Observable<PokerSession> {
        return interval(intervalMs).pipe(
            switchMap(() => this.buscarSessao(sessionId)),
            takeWhile((session) => session.status !== 'CLOSED', true)
        );
    }
}
