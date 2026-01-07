package com.planningpoker.dominio.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO para login de usuário.
 */
public record LoginDTO(
        @NotBlank(message = "Email é obrigatório") @Email(message = "Email inválido") String email,

        @NotBlank(message = "Senha é obrigatória") String senha) {
}
