package com.planningpoker.dominio.entidade;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Entidade Vote - Representa um voto em uma sessão de poker planning.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "PP_VOTE", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "ID_SESSION", "TXT_PARTICIPANT_NAME" })
})
public class Vote implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_VOTE")
    private Long id;

    @Column(name = "TXT_PARTICIPANT_NAME", nullable = false, length = 100)
    private String participantName;

    @Column(name = "TXT_VALUE", length = 10)
    private String value;

    @Column(name = "IND_REVEALED", nullable = false)
    private boolean revealed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_SESSION", nullable = false)
    private PokerSession session;

    @Column(name = "DAT_VOTED", nullable = false)
    private LocalDateTime votedAt;

    @PrePersist
    protected void onCreate() {
        this.votedAt = LocalDateTime.now();
    }

    public Vote(String participantName, String value) {
        this.participantName = participantName;
        this.value = value;
    }

    /**
     * Retorna o valor do voto apenas se já foi revelado ou se é o próprio
     * participante.
     */
    public String getDisplayValue(String requesterName) {
        if (revealed || participantName.equals(requesterName)) {
            return value;
        }
        return "?";
    }

    public boolean hasVoted() {
        return value != null && !value.isEmpty();
    }
}
