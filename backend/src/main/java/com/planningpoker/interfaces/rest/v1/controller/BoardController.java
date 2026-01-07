package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoBoard;
import com.planningpoker.dominio.dto.BoardDTO;
import com.planningpoker.dominio.entidade.Board;
import com.planningpoker.interfaces.rest.v1.BoardAPI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller REST para Boards.
 */
@RequiredArgsConstructor
@RestController
public class BoardController implements BoardAPI {

    private final ServicoBoard servicoBoard;

    @Override
    public ResponseEntity<List<Board>> listar() {
        return ResponseEntity.ok(servicoBoard.listarTodos());
    }

    @Override
    public ResponseEntity<Board> buscarPorId(Long id) {
        return ResponseEntity.ok(servicoBoard.buscarPorId(id));
    }

    @Override
    public ResponseEntity<Board> criar(BoardDTO dto) {
        var board = servicoBoard.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(board);
    }

    @Override
    public ResponseEntity<Board> atualizar(Long id, BoardDTO dto) {
        return ResponseEntity.ok(servicoBoard.atualizar(id, dto));
    }

    @Override
    public ResponseEntity<Void> excluir(Long id) {
        servicoBoard.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<Board>> pesquisar(String q) {
        return ResponseEntity.ok(servicoBoard.pesquisar(q));
    }
}
