package com.planningpoker.dominio.entidade;

import javax.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entidade de Usuário para autenticação.
 */
@Entity
@Table(name = "pp_usuario")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false, unique = true, length = 200)
    private String email;

    @Column(length = 255)
    private String senha;

    @Column(length = 50)
    @Enumerated(EnumType.STRING)
    private AuthProvider provider = AuthProvider.LOCAL;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column
    private Boolean ativo = true;

    @Column(name = "dat_criacao")
    private LocalDateTime datCriacao;

    @Column(name = "dat_atualizacao")
    private LocalDateTime datAtualizacao;

    public Usuario(String nome, String email) {
        this.nome = nome;
        this.email = email;
    }

    @PrePersist
    protected void onCreate() {
        datCriacao = LocalDateTime.now();
        datAtualizacao = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        datAtualizacao = LocalDateTime.now();
    }

    public enum AuthProvider {
        LOCAL, GOOGLE
    }
}
