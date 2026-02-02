package com.planningpoker.dominio.dto;

import javax.validation.constraints.NotBlank;

/**
 * DTO para login com Google.
 */
public record GoogleLoginDTO(
        @NotBlank(message = "Token do Google é obrigatório") String idToken) {
}
