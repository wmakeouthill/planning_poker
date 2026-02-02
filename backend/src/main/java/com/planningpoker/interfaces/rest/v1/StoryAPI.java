package com.planningpoker.interfaces.rest.v1;

import com.planningpoker.dominio.dto.StoryDTO;
import com.planningpoker.dominio.entidade.Story;
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
 * API REST para gerenciamento de Stories.
 */
@RequestMapping("${api.path}/v1/stories")
@Tag(name = "Stories", description = "API para gerenciamento de histórias de usuário")
@ApiResponses({
        @ApiResponse(responseCode = "400", description = "Requisição inválida"),
        @ApiResponse(responseCode = "404", description = "Recurso não encontrado"),
        @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
})
public interface StoryAPI {

    @Operation(summary = "Lista stories de um board")
    @ApiResponse(responseCode = "200", description = "Lista de stories retornada com sucesso")
    @GetMapping("/board/{boardId}")
    ResponseEntity<List<Story>> listarPorBoard(
            @Parameter(description = "ID do board") @PathVariable Long boardId);

    @Operation(summary = "Busca uma story por ID")
    @ApiResponse(responseCode = "200", description = "Story encontrada")
    @GetMapping("/{id}")
    ResponseEntity<Story> buscarPorId(
            @Parameter(description = "ID da story") @PathVariable Long id);

    @Operation(summary = "Cria uma nova story")
    @ApiResponse(responseCode = "201", description = "Story criada com sucesso")
    @PostMapping
    ResponseEntity<Story> criar(@Valid @RequestBody StoryDTO dto);

    @Operation(summary = "Atualiza uma story existente")
    @ApiResponse(responseCode = "200", description = "Story atualizada com sucesso")
    @PutMapping("/{id}")
    ResponseEntity<Story> atualizar(
            @Parameter(description = "ID da story") @PathVariable Long id,
            @Valid @RequestBody StoryDTO dto);

    @Operation(summary = "Exclui uma story")
    @ApiResponse(responseCode = "204", description = "Story excluída com sucesso")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> excluir(
            @Parameter(description = "ID da story") @PathVariable Long id);

    @Operation(summary = "Lista stories não estimadas")
    @ApiResponse(responseCode = "200", description = "Stories não estimadas")
    @GetMapping("/unestimated")
    ResponseEntity<List<Story>> listarNaoEstimadas();
}
