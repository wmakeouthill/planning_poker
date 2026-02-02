package com.planningpoker.dominio.entidade;

import javax.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Participante autenticado em uma sessão (para controle de acesso/histórico).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
        name = "PP_POKER_SESSION_PARTICIPANT",
        uniqueConstraints = @UniqueConstraint(columnNames = { "ID_SESSION", "ID_USUARIO" }))
public class PokerSessionParticipant implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_SESSION_PARTICIPANT")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_SESSION", nullable = false)
    private PokerSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_USUARIO", nullable = false)
    private Usuario usuario;

    @Column(name = "DAT_JOINED", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "TXT_APELIDO", length = 100)
    private String apelido;

    @PrePersist
    protected void onCreate() {
        this.joinedAt = LocalDateTime.now();
    }

    public PokerSessionParticipant(PokerSession session, Usuario usuario) {
        this.session = session;
        this.usuario = usuario;
    }

    public PokerSessionParticipant(PokerSession session, Usuario usuario, String apelido) {
        this.session = session;
        this.usuario = usuario;
        this.apelido = apelido;
    }
}


