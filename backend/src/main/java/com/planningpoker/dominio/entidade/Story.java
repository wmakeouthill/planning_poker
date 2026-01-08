package com.planningpoker.dominio.entidade;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidade Story - Representa uma história de usuário para votação.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "PP_STORY")
public class Story implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_STORY")
    private Long id;

    @Column(name = "TXT_TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "TXT_DESCRIPTION", columnDefinition = "CLOB")
    private String description;

    @Column(name = "NUM_ESTIMATED_POINTS")
    private Integer estimatedPoints;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ID_BOARD", nullable = false)
    private Board board;

    @JsonIgnore
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PokerSession> sessions = new ArrayList<>();

    @Column(name = "DAT_CREATED", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "DAT_UPDATED")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Story(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public void addSession(PokerSession session) {
        sessions.add(session);
        session.setStory(this);
    }
}
