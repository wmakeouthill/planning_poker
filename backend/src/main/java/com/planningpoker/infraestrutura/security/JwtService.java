package com.planningpoker.infraestrutura.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Serviço para geração e validação de tokens JWT.
 */
@Service
@Slf4j
public class JwtService {

    private static final String DEFAULT_SECRET = "planning-poker-jwt-secret-key-default-development-only-minimum-256-bits";

    private final SecretKey secretKey;
    private final long jwtExpiration;

    public JwtService(
            @Value("${jwt.secret:}") String secret,
            @Value("${jwt.expiration:86400000}") long expiration) {

        // Usa secret fornecido ou fallback para desenvolvimento
        String effectiveSecret = (secret != null && secret.length() >= 32) ? secret : DEFAULT_SECRET;

        if (secret == null || secret.length() < 32) {
            log.warn("JWT_SECRET não configurado ou muito curto. Usando secret padrão (NÃO USE EM PRODUÇÃO!)");
        }

        this.secretKey = Keys.hmacShaKeyFor(effectiveSecret.getBytes(StandardCharsets.UTF_8));
        this.jwtExpiration = expiration;
    }

    public String generateToken(String email, Long userId) {
        return Jwts.builder()
                .subject(email)
                .claim("userId", userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(secretKey)
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public Long extractUserId(String token) {
        return extractClaims(token).get("userId", Long.class);
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException e) {
            log.warn("Token inválido: {}", e.getMessage());
            return false;
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
