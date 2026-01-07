import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
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
            map((boards) => {
                // Garantir que sempre seja um array válido, filtrando nulls
                if (!Array.isArray(boards)) {
                    return [];
                }
                // Filtrar qualquer null ou undefined do array
                return boards.filter((board): board is Board => board !== null && board !== undefined && board.id !== null && board.id !== undefined);
            }),
            tap({
                next: (boards) => {
                    this.boards.set(boards);
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
                // Sempre retornar array vazio em caso de erro
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
            map((board) => {
                // Garantir que o board seja válido
                if (!board || !board.id) {
                    // Se o board for inválido mas não for erro de conexão, retornar um board mock
                    return {
                        id: Date.now(), // ID temporário
                        title: dto.title,
                        description: dto.description || '',
                        content: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    } as Board;
                }
                return board;
            }),
            tap((board) => {
                // Só adicionar se o board for válido
                if (board && board.id) {
                    this.boards.update(boards => [board, ...boards]);
                }
            }),
            catchError((error: any) => {
                // Se for erro de conexão, criar board local temporário
                if (error.status === 0 || error.status === 503) {
                    const tempBoard: Board = {
                        id: Date.now(), // ID temporário
                        title: dto.title,
                        description: dto.description || '',
                        content: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    this.boards.update(boards => [tempBoard, ...boards]);
                    return of(tempBoard);
                }
                // Para outros erros, propagar
                throw error;
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

