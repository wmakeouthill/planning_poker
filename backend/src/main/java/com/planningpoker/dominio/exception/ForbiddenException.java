package com.planningpoker.dominio.exception;

/**
 * Exceção para acesso negado a um recurso.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}


