import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { getApiUrl } from '../../../core/utils/api-url';

declare const google: any;

export interface Usuario {
    id: number;
    nome: string;
    email: string;
    avatarUrl: string | null;
    provider: string;
}

export interface AuthResponse {
    token: string;
    tipo: string;
    usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly ngZone = inject(NgZone);

    private get baseUrl(): string {
        return `${getApiUrl()}/v1/auth`;
    }

    // State
    readonly currentUser = signal<Usuario | null>(null);
    readonly token = signal<string | null>(null);
    readonly isAuthenticated = computed(() => !!this.token());

    private googleInitialized = false;

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
            this.token.set(savedToken);
            this.currentUser.set(JSON.parse(savedUser));
        }
    }

    private saveToStorage(token: string, user: Usuario) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.token.set(token);
        this.currentUser.set(user);
    }

    private clearStorage() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        this.token.set(null);
        this.currentUser.set(null);
    }

    async register(nome: string, email: string, senha: string): Promise<void> {
        const response = await firstValueFrom(
            this.http.post<AuthResponse>(`${this.baseUrl}/register`, { nome, email, senha })
        );
        this.saveToStorage(response.token, response.usuario);
    }

    async login(email: string, senha: string): Promise<void> {
        const response = await firstValueFrom(
            this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, senha })
        );
        this.saveToStorage(response.token, response.usuario);
    }

    loginWithGoogle(): Promise<void> {
        return new Promise((resolve, reject) => {
            const clientId = environment.googleClientId;

            if (!clientId) {
                reject(new Error('Google Client ID não configurado'));
                return;
            }

            // Aguarda o SDK carregar
            if (typeof google === 'undefined') {
                reject(new Error('Google SDK não carregado. Recarregue a página.'));
                return;
            }

            try {
                if (!this.googleInitialized) {
                    google.accounts.id.initialize({
                        client_id: clientId,
                        callback: (response: any) => {
                            this.ngZone.run(async () => {
                                try {
                                    await this.handleGoogleCredential(response.credential);
                                    resolve();
                                } catch (err) {
                                    reject(err);
                                }
                            });
                        },
                        // Configurações adicionais para melhor compatibilidade
                        ux_mode: 'popup',
                        auto_select: false,
                        cancel_on_tap_outside: true
                    });
                    this.googleInitialized = true;
                }

                // Usa o botão diretamente em vez de One Tap (mais confiável)
                // One Tap pode ser bloqueado por bloqueadores de anúncios
                this.showGoogleOneTap(resolve, reject);
            } catch (err) {
                reject(err);
            }
        });
    }

    private showGoogleOneTap(resolve: () => void, reject: (err: any) => void) {
        const clientId = environment.googleClientId;

        // Cria um botão temporário para o popup
        const buttonDiv = document.createElement('div');
        buttonDiv.id = 'google-signin-button';
        buttonDiv.style.position = 'fixed';
        buttonDiv.style.top = '50%';
        buttonDiv.style.left = '50%';
        buttonDiv.style.transform = 'translate(-50%, -50%)';
        buttonDiv.style.zIndex = '9999';
        buttonDiv.style.backgroundColor = 'white';
        buttonDiv.style.padding = '10px';
        buttonDiv.style.borderRadius = '8px';
        buttonDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        document.body.appendChild(buttonDiv);

        try {
            google.accounts.id.renderButton(buttonDiv, {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                text: 'signin_with',
                width: 250
            });

            // Aguarda um pouco para o botão ser renderizado
            setTimeout(() => {
                const button = buttonDiv.querySelector('div[role="button"]') as HTMLElement;
                if (button) {
                    button.click();
                } else {
                    reject(new Error('Botão do Google não foi renderizado. Verifique se bloqueadores de anúncios estão desabilitados.'));
                    buttonDiv.remove();
                }
            }, 100);

            // Remove após 30 segundos se não for clicado
            setTimeout(() => {
                if (document.getElementById('google-signin-button')) {
                    buttonDiv.remove();
                    reject(new Error('Tempo de espera esgotado. Tente novamente.'));
                }
            }, 30000);
        } catch (err) {
            buttonDiv.remove();
            reject(err);
        }
    }

    private async handleGoogleCredential(credential: string): Promise<void> {
        const response = await firstValueFrom(
            this.http.post<AuthResponse>(`${this.baseUrl}/google`, { idToken: credential })
        );
        this.saveToStorage(response.token, response.usuario);

        // Remove botão temporário se existir
        const buttonDiv = document.getElementById('google-signin-button');
        if (buttonDiv) {
            buttonDiv.remove();
        }
    }

    async getCurrentUser(): Promise<Usuario | null> {
        if (!this.token()) return null;

        try {
            const user = await firstValueFrom(
                this.http.get<Usuario>(`${this.baseUrl}/me`)
            );
            this.currentUser.set(user);
            return user;
        } catch {
            this.logout();
            return null;
        }
    }

    logout() {
        this.clearStorage();

        // Revoga sessão do Google se estiver usando
        if (typeof google !== 'undefined' && this.googleInitialized) {
            google.accounts.id.disableAutoSelect();
        }
    }

    getAuthHeaders(): { Authorization: string } | {} {
        const token = this.token();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
}
