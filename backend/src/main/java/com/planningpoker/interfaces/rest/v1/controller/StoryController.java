package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoStory;
import com.planningpoker.dominio.dto.StoryDTO;
import com.planningpoker.dominio.entidade.Story;
import com.planningpoker.interfaces.rest.v1.StoryAPI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller REST para Stories.
 */
@RequiredArgsConstructor
@RestController
public class StoryController implements StoryAPI {

    private final ServicoStory servicoStory;

    @Override
    public ResponseEntity<List<Story>> listarPorBoard(Long boardId) {
        return ResponseEntity.ok(servicoStory.listarPorBoard(boardId));
    }

    @Override
    public ResponseEntity<Story> buscarPorId(Long id) {
        return ResponseEntity.ok(servicoStory.buscarPorId(id));
    }

    @Override
    public ResponseEntity<Story> criar(StoryDTO dto) {
        var story = servicoStory.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(story);
    }

    @Override
    public ResponseEntity<Story> atualizar(Long id, StoryDTO dto) {
        return ResponseEntity.ok(servicoStory.atualizar(id, dto));
    }

    @Override
    public ResponseEntity<Void> excluir(Long id) {
        servicoStory.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<Story>> listarNaoEstimadas() {
        return ResponseEntity.ok(servicoStory.listarNaoEstimadas());
    }
}
