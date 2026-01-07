import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [FormsModule, RouterLink],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css'
})
export class RegisterComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly nome = signal('');
    readonly email = signal('');
    readonly senha = signal('');
    readonly confirmarSenha = signal('');
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    async register() {
        this.loading.set(true);
        this.error.set(null);

        if (this.senha() !== this.confirmarSenha()) {
            this.error.set('As senhas não conferem');
            this.loading.set(false);
            return;
        }

        if (this.senha().length < 6) {
            this.error.set('A senha deve ter no mínimo 6 caracteres');
            this.loading.set(false);
            return;
        }

        try {
            await this.authService.register(this.nome(), this.email(), this.senha());
            this.router.navigate(['/boards']);
        } catch (err: any) {
            this.error.set(err?.error?.message || 'Erro ao criar conta');
        } finally {
            this.loading.set(false);
        }
    }

    async loginWithGoogle() {
        this.loading.set(true);
        this.error.set(null);

        try {
            await this.authService.loginWithGoogle();
            this.router.navigate(['/boards']);
        } catch (err: any) {
            this.error.set(err?.error?.message || 'Erro ao fazer login com Google');
        } finally {
            this.loading.set(false);
        }
    }
}
