package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoAuth;
import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.Usuario;
import com.planningpoker.dominio.exception.BusinessException;
import com.planningpoker.infraestrutura.security.GoogleTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller de autenticação.
 */
@RestController
@RequestMapping("${api.path}/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "API de autenticação")
public class AuthController {

    private final ServicoAuth servicoAuth;
    private final GoogleTokenService googleTokenService;

    @Operation(summary = "Registrar novo usuário")
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> registrar(@Valid @RequestBody RegisterDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoAuth.registrar(dto));
    }

    @Operation(summary = "Login com email e senha")
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginDTO dto) {
        return ResponseEntity.ok(servicoAuth.login(dto));
    }

    @Operation(summary = "Login com Google")
    @PostMapping("/google")
    public ResponseEntity<AuthResponseDTO> loginGoogle(@Valid @RequestBody GoogleLoginDTO dto) {
        if (!googleTokenService.isEnabled()) {
            throw new BusinessException("Login com Google não configurado. Configure GOOGLE_CLIENT_ID.");
        }

        var userInfo = googleTokenService.verifyToken(dto.idToken())
                .orElseThrow(() -> new BusinessException("Token do Google inválido"));

        var response = servicoAuth.loginGoogle(
                userInfo.email(),
                userInfo.name(),
                userInfo.pictureUrl(),
                userInfo.googleId());

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Buscar usuário autenticado")
    @GetMapping("/me")
    public ResponseEntity<UsuarioResponseDTO> me(@AuthenticationPrincipal Usuario usuario) {
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(servicoAuth.buscarUsuarioAtual(usuario.getId()));
    }
}
