import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PokerService } from '../../services/poker.service';

/**
 * Página para entrar em uma sessão via link/código de convite.
 * Responsabilidade única: realizar o join e redirecionar para a sala.
 */
@Component({
    selector: 'app-poker-join',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './poker-join.component.html',
    styleUrl: './poker-join.component.css'
})
export class PokerJoinComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly pokerService = inject(PokerService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        const inviteCode = this.route.snapshot.paramMap.get('inviteCode');
        if (!inviteCode) {
            this.error.set('Link de convite inválido.');
            this.loading.set(false);
            return;
        }

        this.pokerService.entrarPorInviteCode(inviteCode).subscribe({
            next: ({ sessionId, apelido }) => {
                // Se o backend retornou um apelido, usar ele (persistido na sessão)
                // Caso contrário, o componente poker-room vai pedir o apelido
                if (apelido && apelido.trim() !== '') {
                    this.pokerService.setParticipantName(apelido);
                }
                this.router.navigate(['/poker', sessionId]);
            },
            error: () => {
                this.error.set('Não foi possível entrar na sessão. Verifique o link e tente novamente.');
                this.loading.set(false);
            }
        });
    }
}


