export interface Board {
    id: number;
    title: string;
    description: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBoardDTO {
    title: string;
    description: string;
    content?: string;
}
