export type SessionMode = 'EFFORT_ESTIMATION' | 'PRIORITY_VOTING';

export interface PokerSession {
    id: number;
    name: string;
    status: 'VOTING' | 'REVEALED' | 'CLOSED';
    mode: SessionMode;
    storyId: number | null;
    storyTitle: string | null;
    inviteCode?: string | null;
    votes: Vote[];
    averageVote: number | null;
    createdAt: string;
    revealedAt: string | null;
    createdBy?: string; // Nome do criador/mestre da sessão
    participantApelido?: string | null; // Apelido do participante atual na sessão
    novaSessaoId?: number | null; // ID da nova sessão quando nova rodada é criada
}

export interface Vote {
    id: number;
    participantName: string;
    value: string;
    revealed: boolean;
    hasVoted: boolean;
}

export interface CreateSessionDTO {
    name: string;
    storyId?: number;
    mode?: SessionMode;
}

export interface VoteRequestDTO {
    sessionId: number;
    participantName: string;
    value: string;
}

// Valores para estimativa de esforço (Fibonacci)
export const EFFORT_ESTIMATION_VALUES = ['0', '½', '1', '2', '3', '5', '8', '13', '21', '?', '☕'] as const;

// Valores para votação de prioridade (1 a 12 + café)
export const PRIORITY_VOTING_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '☕'] as const;

// Mantém POKER_VALUES para compatibilidade (usa estimativa por padrão)
export const POKER_VALUES = EFFORT_ESTIMATION_VALUES;
export type PokerValue = typeof EFFORT_ESTIMATION_VALUES[number] | typeof PRIORITY_VOTING_VALUES[number];

// Função helper para obter valores baseado no modo
export function getVotingValues(mode: SessionMode): readonly string[] {
    return mode === 'PRIORITY_VOTING' ? PRIORITY_VOTING_VALUES : EFFORT_ESTIMATION_VALUES;
}

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
