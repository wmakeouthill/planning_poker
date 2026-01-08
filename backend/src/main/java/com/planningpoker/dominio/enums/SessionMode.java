package com.planningpoker.dominio.enums;

/**
 * Enum que representa o modo de uma sessão de Poker Planning.
 */
public enum SessionMode {
    /**
     * Modo de estimativa de esforço - usa sequência Fibonacci (0, ½, 1, 2, 3, 5, 8, 13, 21, ?, ☕)
     */
    EFFORT_ESTIMATION,
    
    /**
     * Modo de votação de prioridade - usa números de 1 a 12 + café (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, ☕)
     */
    PRIORITY_VOTING
}
