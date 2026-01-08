import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

interface NavItem {
    label: string;
    path: string;
    icon: string;
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
    @Input() isOpen = true;
    @Output() toggle = new EventEmitter<void>();

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly isAuthenticated = this.authService.isAuthenticated;

    navItems: NavItem[] = [
        {
            label: 'Boards',
            path: '/boards',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        },
        {
            label: 'Poker Planning',
            path: '/poker',
            icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
            label: 'Histórico',
            path: '/poker/history',
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        }
    ];

    onToggle() {
        this.toggle.emit();
    }

    onLogout() {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
