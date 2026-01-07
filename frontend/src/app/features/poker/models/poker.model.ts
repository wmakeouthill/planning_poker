export interface PokerSession {
    id: number;
    name: string;
    status: 'VOTING' | 'REVEALED' | 'CLOSED';
    storyId: number | null;
    storyTitle: string | null;
    votes: Vote[];
    averageVote: number | null;
    createdAt: string;
    revealedAt: string | null;
    createdBy?: string; // Nome do criador/mestre da sessão
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
}

export interface VoteRequestDTO {
    sessionId: number;
    participantName: string;
    value: string;
}

export const POKER_VALUES = ['0', '½', '1', '2', '3', '5', '8', '13', '21', '?', '☕'] as const;
export type PokerValue = typeof POKER_VALUES[number];

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
