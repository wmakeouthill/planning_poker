package com.planningpoker.dominio.exception;

/**
 * Exceção para regras de negócio violadas.
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
