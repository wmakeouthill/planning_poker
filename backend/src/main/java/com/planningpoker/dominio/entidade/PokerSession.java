package com.planningpoker.dominio.entidade;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.planningpoker.dominio.enums.SessionMode;
import com.planningpoker.dominio.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entidade PokerSession - Representa uma sessão de votação de poker planning.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "PP_POKER_SESSION")
public class PokerSession implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_SESSION")
    private Long id;

    @Column(name = "TXT_NAME", length = 200)
    private String name;

    @Column(name = "TXT_INVITE_CODE", length = 64, unique = true)
    private String inviteCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "COD_STATUS", nullable = false)
    private SessionStatus status = SessionStatus.VOTING;

    @Enumerated(EnumType.STRING)
    @Column(name = "COD_MODE", nullable = false)
    private SessionMode mode = SessionMode.EFFORT_ESTIMATION;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_STORY")
    private Story story;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Vote> votes = new ArrayList<>();

    @Column(name = "DAT_CREATED", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "DAT_REVEALED")
    private LocalDateTime revealedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.inviteCode == null || this.inviteCode.isBlank()) {
            this.inviteCode = UUID.randomUUID().toString().replace("-", "");
        }
    }

    public PokerSession(String name) {
        this.name = name;
        this.status = SessionStatus.VOTING;
        this.mode = SessionMode.EFFORT_ESTIMATION;
    }

    public PokerSession(String name, SessionMode mode) {
        this.name = name;
        this.status = SessionStatus.VOTING;
        this.mode = mode != null ? mode : SessionMode.EFFORT_ESTIMATION;
    }

    public void addVote(Vote vote) {
        votes.add(vote);
        vote.setSession(this);
    }

    public void revealVotes() {
        this.status = SessionStatus.REVEALED;
        this.revealedAt = LocalDateTime.now();
        votes.forEach(v -> v.setRevealed(true));
    }

    public void close() {
        this.status = SessionStatus.CLOSED;
    }

    public void resetVotes() {
        this.votes.clear();
        this.status = SessionStatus.VOTING;
        this.revealedAt = null;
    }

    public boolean isVotingOpen() {
        return this.status == SessionStatus.VOTING;
    }

    public boolean isRevealed() {
        return this.status == SessionStatus.REVEALED;
    }

    /**
     * Calcula a média dos votos (excluindo '?' e '☕').
     */
    public Double calculateAverage() {
        return votes.stream()
                .filter(v -> v.getValue() != null && !v.getValue().equals("?") && !v.getValue().equals("☕"))
                .mapToDouble(v -> parseVoteValue(v.getValue()))
                .average()
                .orElse(0.0);
    }

    private double parseVoteValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0.0;
        }
        return switch (value) {
            case "½" -> 0.5;
            case "☕" -> 0.0; // Café não conta para média
            default -> {
                try {
                    yield Double.parseDouble(value);
                } catch (NumberFormatException e) {
                    yield 0.0;
                }
            }
        };
    }
}
