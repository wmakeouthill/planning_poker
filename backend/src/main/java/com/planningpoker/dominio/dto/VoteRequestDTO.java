package com.planningpoker.dominio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * DTO para registrar um voto.
 */
public record VoteRequestDTO(
        @NotNull(message = "ID da sessão é obrigatório") Long sessionId,

        @NotBlank(message = "Nome do participante é obrigatório") String participantName,

        @NotBlank(message = "Valor do voto é obrigatório") String value) {
}
