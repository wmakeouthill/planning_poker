package com.planningpoker.interfaces.rest.v1.controller;

import com.planningpoker.aplicacao.ServicoPokerSession;
import com.planningpoker.dominio.dto.*;
import com.planningpoker.dominio.entidade.PokerSession;
import com.planningpoker.dominio.enums.SessionStatus;
import com.planningpoker.interfaces.rest.v1.PokerSessionAPI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller REST para Poker Sessions.
 */
@RequiredArgsConstructor
@RestController
public class PokerSessionController implements PokerSessionAPI {

    private final ServicoPokerSession servicoPokerSession;

    @Override
    public ResponseEntity<List<PokerSession>> listarAtivas() {
        return ResponseEntity.ok(servicoPokerSession.listarAtivas());
    }

    @Override
    public ResponseEntity<PokerSessionDTO> buscarPorId(Long id, String participant) {
        return ResponseEntity.ok(servicoPokerSession.buscarPorId(id, participant));
    }

    @Override
    public ResponseEntity<PokerSession> criar(CreateSessionDTO dto) {
        var session = servicoPokerSession.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @Override
    public ResponseEntity<VoteDTO> votar(VoteRequestDTO dto) {
        return ResponseEntity.ok(servicoPokerSession.votar(dto));
    }

    @Override
    public ResponseEntity<PokerSessionDTO> revelarVotos(Long id) {
        return ResponseEntity.ok(servicoPokerSession.revelarVotos(id));
    }

    @Override
    public ResponseEntity<PokerSessionDTO> resetarVotos(Long id) {
        return ResponseEntity.ok(servicoPokerSession.resetarVotos(id));
    }

    @Override
    public ResponseEntity<PokerSessionDTO> novaRodada(Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoPokerSession.novaRodada(id));
    }

    @Override
    public ResponseEntity<Void> fecharSessao(Long id) {
        servicoPokerSession.fecharSessao(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PokerSession> buscarSessaoAtiva() {
        var sessionOpt = servicoPokerSession.buscarSessaoAtiva();
        if (sessionOpt.isPresent()) {
            var session = sessionOpt.get();
            return ResponseEntity.ok(session);
        }
        // Retorna 204 No Content quando não há sessão ativa
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PageResponseDTO<PokerSessionDTO>> listarHistorico(int page, int size, SessionStatus status) {
        return ResponseEntity.ok(servicoPokerSession.listarHistorico(page, size, status));
    }

    @Override
    public ResponseEntity<JoinSessionResponseDTO> entrarPorInviteCode(String inviteCode) {
        return ResponseEntity.ok(servicoPokerSession.entrarPorInviteCode(inviteCode));
    }

    @Override
    public ResponseEntity<Void> enviarAnimacao(Long id, AnimationEventDTO dto) {
        servicoPokerSession.enviarAnimacao(id, dto);
        return ResponseEntity.ok().build();
    }
}
