import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'boards',
        pathMatch: 'full'
    },
    {
        path: 'auth',
        canActivate: [guestGuard],
        children: [
            {
                path: 'login',
                loadComponent: () => import('./features/auth/pages/login/login.component')
                    .then(m => m.LoginComponent)
            },
            {
                path: 'register',
                loadComponent: () => import('./features/auth/pages/register/register.component')
                    .then(m => m.RegisterComponent)
            },
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: 'boards',
        canActivate: [authGuard],
        loadComponent: () => import('./features/boards/pages/board-list/board-list.component')
            .then(m => m.BoardListComponent)
    },
    {
        path: 'boards/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/boards/pages/board-editor/board-editor.component')
            .then(m => m.BoardEditorComponent)
    },
    {
        path: 'poker/history',
        canActivate: [authGuard],
        loadComponent: () => import('./features/poker/pages/session-history/session-history.component')
            .then(m => m.SessionHistoryComponent)
    },
    {
        // Importante: com baseHref '/poker/', a URL final fica /poker/join/:inviteCode
        path: 'join/:inviteCode',
        canActivate: [authGuard],
        loadComponent: () => import('./features/poker/pages/poker-join/poker-join.component')
            .then(m => m.PokerJoinComponent)
    },
    {
        path: 'poker/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/poker/pages/poker-room/poker-room.component')
            .then(m => m.PokerRoomComponent)
    },
    {
        path: 'poker',
        canActivate: [authGuard],
        loadComponent: () => import('./features/poker/pages/poker-room/poker-room.component')
            .then(m => m.PokerRoomComponent)
    },
    {
        path: '**',
        redirectTo: 'boards'
    }
];
