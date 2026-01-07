package com.planningpoker.infraestrutura.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Optional;

/**
 * Serviço para validação de tokens do Google.
 */
@Service
@Slf4j
public class GoogleTokenService {

    private final GoogleIdTokenVerifier verifier;
    private final boolean enabled;

    public GoogleTokenService(@Value("${GOOGLE_CLIENT_ID:}") String clientId) {
        this.enabled = clientId != null && !clientId.isBlank();

        if (enabled) {
            this.verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(clientId))
                    .build();
            log.info("Google Token Service inicializado com Client ID configurado");
        } else {
            this.verifier = null;
            log.warn("Google Token Service desabilitado - GOOGLE_CLIENT_ID não configurado");
        }
    }

    public record GoogleUserInfo(String email, String name, String pictureUrl, String googleId) {
    }

    public Optional<GoogleUserInfo> verifyToken(String idToken) {
        if (!enabled) {
            log.error("Tentativa de validar token Google sem GOOGLE_CLIENT_ID configurado");
            return Optional.empty();
        }

        try {
            GoogleIdToken token = verifier.verify(idToken);

            if (token == null) {
                log.warn("Token Google inválido");
                return Optional.empty();
            }

            GoogleIdToken.Payload payload = token.getPayload();

            return Optional.of(new GoogleUserInfo(
                    payload.getEmail(),
                    (String) payload.get("name"),
                    (String) payload.get("picture"),
                    payload.getSubject()));
        } catch (Exception e) {
            log.error("Erro ao validar token Google: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean isEnabled() {
        return enabled;
    }
}
