package com.planningpoker.interfaces.rest.v1;

import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.PokerSession;
import com.planningpoker.dominio.enums.SessionStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API REST para gerenciamento de sessões de Poker Planning.
 */
@RequestMapping("${api.path}/v1/poker")
@Tag(name = "Poker Planning", description = "API para sessões de planning poker")
@ApiResponses({
                @ApiResponse(responseCode = "400", description = "Requisição inválida"),
                @ApiResponse(responseCode = "404", description = "Recurso não encontrado"),
                @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
})
public interface PokerSessionAPI {

        @Operation(summary = "Lista sessões ativas")
        @ApiResponse(responseCode = "200", description = "Lista de sessões retornada com sucesso")
        @GetMapping("/sessions")
        ResponseEntity<List<PokerSession>> listarAtivas();

        @Operation(summary = "Busca uma sessão por ID")
        @ApiResponse(responseCode = "200", description = "Sessão encontrada")
        @GetMapping("/sessions/{id}")
        ResponseEntity<PokerSessionDTO> buscarPorId(
                        @Parameter(description = "ID da sessão") @PathVariable Long id,
                        @Parameter(description = "Nome do participante para mostrar seu voto") @RequestParam(required = false) String participant);

        @Operation(summary = "Cria uma nova sessão de poker")
        @ApiResponse(responseCode = "201", description = "Sessão criada com sucesso")
        @PostMapping("/sessions")
        ResponseEntity<PokerSession> criar(@Valid @RequestBody CreateSessionDTO dto);

        @Operation(summary = "Registra um voto")
        @ApiResponse(responseCode = "200", description = "Voto registrado com sucesso")
        @PostMapping("/vote")
        ResponseEntity<VoteDTO> votar(@Valid @RequestBody VoteRequestDTO dto);

        @Operation(summary = "Revela os votos da sessão")
        @ApiResponse(responseCode = "200", description = "Votos revelados com sucesso")
        @PostMapping("/sessions/{id}/reveal")
        ResponseEntity<PokerSessionDTO> revelarVotos(
                        @Parameter(description = "ID da sessão") @PathVariable Long id);

        @Operation(summary = "Reseta os votos da sessão")
        @ApiResponse(responseCode = "200", description = "Votos resetados com sucesso")
        @PostMapping("/sessions/{id}/reset")
        ResponseEntity<PokerSessionDTO> resetarVotos(
                        @Parameter(description = "ID da sessão") @PathVariable Long id);

        @Operation(summary = "Cria nova rodada mantendo os mesmos participantes")
        @ApiResponse(responseCode = "201", description = "Nova rodada criada com sucesso")
        @PostMapping("/sessions/{id}/nova-rodada")
        ResponseEntity<PokerSessionDTO> novaRodada(
                        @Parameter(description = "ID da sessão atual") @PathVariable Long id);

        @Operation(summary = "Fecha uma sessão")
        @ApiResponse(responseCode = "204", description = "Sessão fechada com sucesso")
        @PostMapping("/sessions/{id}/close")
        ResponseEntity<Void> fecharSessao(
                        @Parameter(description = "ID da sessão") @PathVariable Long id);

        @Operation(summary = "Busca sessão ativa atual")
        @ApiResponse(responseCode = "200", description = "Sessão ativa encontrada")
        @GetMapping("/sessions/active")
        ResponseEntity<PokerSession> buscarSessaoAtiva();

        @Operation(summary = "Lista histórico de sessões com paginação")
        @ApiResponse(responseCode = "200", description = "Histórico de sessões retornado com sucesso")
        @GetMapping("/sessions/history")
        ResponseEntity<PageResponseDTO<PokerSessionDTO>> listarHistorico(
                        @Parameter(description = "Número da página (0-indexed)") @RequestParam(defaultValue = "0") int page,
                        @Parameter(description = "Tamanho da página") @RequestParam(defaultValue = "10") int size,
                        @Parameter(description = "Filtro por status (opcional)") @RequestParam(required = false) SessionStatus status);

        @Operation(summary = "Entra em uma sessão via código de convite")
        @ApiResponse(responseCode = "200", description = "Entrada realizada com sucesso")
        @PostMapping("/sessions/join/{inviteCode}")
        ResponseEntity<JoinSessionResponseDTO> entrarPorInviteCode(
                        @Parameter(description = "Código de convite da sessão") @PathVariable String inviteCode);

        @Operation(summary = "Envia evento de animação (emoji ou bola de papel)")
        @ApiResponse(responseCode = "200", description = "Evento enviado com sucesso")
        @PostMapping("/sessions/{id}/animation")
        ResponseEntity<Void> enviarAnimacao(
                        @Parameter(description = "ID da sessão") @PathVariable Long id,
                        @Valid @RequestBody AnimationEventDTO dto);
}
