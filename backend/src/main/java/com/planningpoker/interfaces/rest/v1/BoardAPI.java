package com.planningpoker.interfaces.rest.v1;

import com.planningpoker.dominio.dto.BoardDTO;
import com.planningpoker.dominio.entidade.Board;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API REST para gerenciamento de Boards.
 */
@RequestMapping("${api.path}/v1/boards")
@Tag(name = "Boards", description = "API para gerenciamento de boards de anotações")
@ApiResponses({
        @ApiResponse(responseCode = "400", description = "Requisição inválida"),
        @ApiResponse(responseCode = "404", description = "Recurso não encontrado"),
        @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
})
public interface BoardAPI {

    @Operation(summary = "Lista todos os boards")
    @ApiResponse(responseCode = "200", description = "Lista de boards retornada com sucesso")
    @GetMapping
    ResponseEntity<List<Board>> listar();

    @Operation(summary = "Busca um board por ID")
    @ApiResponse(responseCode = "200", description = "Board encontrado")
    @GetMapping("/{id}")
    ResponseEntity<Board> buscarPorId(
            @Parameter(description = "ID do board") @PathVariable Long id);

    @Operation(summary = "Cria um novo board")
    @ApiResponse(responseCode = "201", description = "Board criado com sucesso")
    @PostMapping
    ResponseEntity<Board> criar(@Valid @RequestBody BoardDTO dto);

    @Operation(summary = "Atualiza um board existente")
    @ApiResponse(responseCode = "200", description = "Board atualizado com sucesso")
    @PutMapping("/{id}")
    ResponseEntity<Board> atualizar(
            @Parameter(description = "ID do board") @PathVariable Long id,
            @Valid @RequestBody BoardDTO dto);

    @Operation(summary = "Exclui um board")
    @ApiResponse(responseCode = "204", description = "Board excluído com sucesso")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> excluir(
            @Parameter(description = "ID do board") @PathVariable Long id);

    @Operation(summary = "Pesquisa boards por termo")
    @ApiResponse(responseCode = "200", description = "Boards encontrados")
    @GetMapping("/search")
    ResponseEntity<List<Board>> pesquisar(
            @Parameter(description = "Termo de busca") @RequestParam String q);
}
