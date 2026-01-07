import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [FormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly email = signal('');
    readonly senha = signal('');
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    async login() {
        this.loading.set(true);
        this.error.set(null);

        try {
            await this.authService.login(this.email(), this.senha());
            this.router.navigate(['/boards']);
        } catch (err: any) {
            this.error.set(err?.error?.message || 'Erro ao fazer login');
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
