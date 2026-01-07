package com.planningpoker.dominio.enums;

/**
 * Status de uma sessão de poker planning.
 */
public enum SessionStatus {
    VOTING, // Participantes estão votando
    REVEALED, // Votos foram revelados
    CLOSED // Sessão encerrada
}
