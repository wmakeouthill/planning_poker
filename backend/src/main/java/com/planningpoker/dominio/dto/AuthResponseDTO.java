package com.planningpoker.dominio.dto;

/**
 * DTO para resposta de autenticação.
 */
public record AuthResponseDTO(
        String token,
        String tipo,
        UsuarioResponseDTO usuario) {
    public AuthResponseDTO(String token, UsuarioResponseDTO usuario) {
        this(token, "Bearer", usuario);
    }
}
