package com.planningpoker.dominio.entidade;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidade Board - Representa um quadro de anotações sobre histórias.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "PP_BOARD")
public class Board implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID_BOARD")
    private Long id;

    @Column(name = "TXT_TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "TXT_DESCRIPTION", length = 500)
    private String description;

    @Column(name = "TXT_CONTENT", columnDefinition = "CLOB")
    private String content;

    @Column(name = "DAT_CREATED", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "DAT_UPDATED")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Story> stories = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Board(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public void addStory(Story story) {
        stories.add(story);
        story.setBoard(this);
    }

    public void removeStory(Story story) {
        stories.remove(story);
        story.setBoard(null);
    }
}
