package com.planningpoker.dominio.exception;

/**
 * Exceção para recurso não encontrado.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, Long id) {
        super(String.format("%s com id %d não encontrado", resource, id));
    }
}
