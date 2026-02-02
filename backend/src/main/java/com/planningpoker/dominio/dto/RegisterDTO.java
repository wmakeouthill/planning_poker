package com.planningpoker.dominio.dto;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

/**
 * DTO para registro de novo usuário.
 */
public record RegisterDTO(
        @NotBlank(message = "Nome é obrigatório") @Size(min = 2, max = 200, message = "Nome deve ter entre 2 e 200 caracteres") String nome,

        @NotBlank(message = "Email é obrigatório") @Email(message = "Email inválido") String email,

        @NotBlank(message = "Senha é obrigatória") @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres") String senha) {
}
