import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente Dumb para exibir e copiar o link de convite.
 * Responsabilidade única: apresentar o link e permitir copiar para a área de transferência.
 */
@Component({
    selector: 'app-invite-link',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './invite-link.component.html',
    styleUrl: './invite-link.component.css'
})
export class InviteLinkComponent {
    @Input({ required: true }) inviteUrl!: string;

    readonly copied = signal(false);

    async copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.inviteUrl);
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        } catch {
            // Fallback simples
            const el = document.createElement('textarea');
            el.value = this.inviteUrl;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);

            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        }
    }
}


