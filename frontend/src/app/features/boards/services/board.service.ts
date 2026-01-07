import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Board, CreateBoardDTO } from '../models/board.model';

@Injectable({ providedIn: 'root' })
export class BoardService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = 'http://localhost:8080/api/v1/boards';

    // State usando Signals
    readonly boards = signal<Board[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    listar(): Observable<Board[]> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.get<Board[]>(this.baseUrl).pipe(
            tap({
                next: (boards) => {
                    // Garantir que sempre seja um array, nunca null ou undefined
                    this.boards.set(Array.isArray(boards) ? boards : []);
                    this.loading.set(false);
                },
                error: (err) => {
                    // Não logar erro se for erro de conexão (backend offline)
                    if (err.status !== 0 && err.status !== 503) {
                        this.error.set('Erro ao carregar boards');
                    }
                    this.loading.set(false);
                }
            }),
            catchError((error: any) => {
                // Se for erro de conexão, retornar array vazio
                if (error.status === 0 || error.status === 503) {
                    this.boards.set([]);
                    this.loading.set(false);
                    return of([]);
                }
                // Para outros erros, também retornar array vazio para não quebrar
                this.boards.set([]);
                this.loading.set(false);
                return of([]);
            })
        );
    }

    buscarPorId(id: number): Observable<Board> {
        return this.http.get<Board>(`${this.baseUrl}/${id}`);
    }

    criar(dto: CreateBoardDTO): Observable<Board> {
        return this.http.post<Board>(this.baseUrl, dto).pipe(
            tap((board) => {
                this.boards.update(boards => [board, ...boards]);
            })
        );
    }

    atualizar(id: number, dto: CreateBoardDTO): Observable<Board> {
        return this.http.put<Board>(`${this.baseUrl}/${id}`, dto).pipe(
            tap((updated) => {
                this.boards.update(boards =>
                    boards.map(b => b.id === id ? updated : b)
                );
            })
        );
    }

    excluir(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
            tap(() => {
                this.boards.update(boards => boards.filter(b => b.id !== id));
            })
        );
    }

    pesquisar(termo: string): Observable<Board[]> {
        return this.http.get<Board[]>(`${this.baseUrl}/search`, {
            params: { q: termo }
        });
    }
}

