package com.planningpoker.aplicacao;

import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.Usuario;
import com.planningpoker.dominio.exception.BusinessException;
import com.planningpoker.dominio.repository.UsuarioRepository;
import com.planningpoker.infraestrutura.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço de autenticação.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServicoAuth {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponseDTO registrar(RegisterDTO dto) {
        log.info("Registrando novo usuário: {}", dto.email());

        if (usuarioRepository.existsByEmail(dto.email())) {
            throw new BusinessException("Email já cadastrado");
        }

        var usuario = new Usuario(dto.nome(), dto.email());
        usuario.setSenha(passwordEncoder.encode(dto.senha()));
        usuario.setProvider(Usuario.AuthProvider.LOCAL);

        usuario = usuarioRepository.save(usuario);

        String token = jwtService.generateToken(usuario.getEmail(), usuario.getId());

        return new AuthResponseDTO(token, UsuarioResponseDTO.from(usuario));
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO login(LoginDTO dto) {
        log.info("Login de usuário: {}", dto.email());

        var usuario = usuarioRepository.findByEmail(dto.email())
                .orElseThrow(() -> new BusinessException("Credenciais inválidas"));

        if (usuario.getProvider() != Usuario.AuthProvider.LOCAL) {
            throw new BusinessException(
                    "Usuário cadastrado via " + usuario.getProvider() + ". Use o login apropriado.");
        }

        if (!passwordEncoder.matches(dto.senha(), usuario.getSenha())) {
            throw new BusinessException("Credenciais inválidas");
        }

        if (!usuario.getAtivo()) {
            throw new BusinessException("Usuário inativo");
        }

        String token = jwtService.generateToken(usuario.getEmail(), usuario.getId());

        return new AuthResponseDTO(token, UsuarioResponseDTO.from(usuario));
    }

    @Transactional
    public AuthResponseDTO loginGoogle(String email, String nome, String avatarUrl, String providerId) {
        log.info("Login via Google: {}", email);

        var usuario = usuarioRepository.findByEmail(email)
                .orElseGet(() -> {
                    var novoUsuario = new Usuario(nome, email);
                    novoUsuario.setProvider(Usuario.AuthProvider.GOOGLE);
                    novoUsuario.setProviderId(providerId);
                    novoUsuario.setAvatarUrl(avatarUrl);
                    return usuarioRepository.save(novoUsuario);
                });

        // Atualiza avatar se mudou
        if (avatarUrl != null && !avatarUrl.equals(usuario.getAvatarUrl())) {
            usuario.setAvatarUrl(avatarUrl);
            usuarioRepository.save(usuario);
        }

        String token = jwtService.generateToken(usuario.getEmail(), usuario.getId());

        return new AuthResponseDTO(token, UsuarioResponseDTO.from(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponseDTO buscarUsuarioAtual(Long userId) {
        var usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        return UsuarioResponseDTO.from(usuario);
    }
}
