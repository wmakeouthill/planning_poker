package com.planningpoker.dominio.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 * DTO para registrar um voto.
 * O campo value pode ser vazio quando o participante está apenas entrando na sessão.
 */
public record VoteRequestDTO(
        @NotNull(message = "ID da sessão é obrigatório") Long sessionId,

        @NotBlank(message = "Nome do participante é obrigatório") String participantName,

        String value) { // value é opcional - pode ser vazio para apenas entrar na sessão
}
