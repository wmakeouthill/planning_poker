import { HttpInterceptorFn, HttpErrorResponse, HttpResponse, HttpEvent } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

/**
 * Interceptor para suprimir erros de conexão (ERR_EMPTY_RESPONSE).
 * Quando o backend não está disponível, não há necessidade de logar erros.
 * 
 * NOTA: O erro ERR_EMPTY_RESPONSE no DevTools do navegador é normal quando
 * o backend está offline e não pode ser completamente suprimido, mas este
 * interceptor garante que a aplicação continue funcionando normalmente.
 */
export const pokerErrorInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Suprimir erros de conexão (status 0) - backend offline
            if (error.status === 0) {
                // Para endpoint de sessão ativa, retornar 204 (caso normal)
                if (req.url.includes('/sessions/active')) {
                    return of(new HttpResponse({
                        status: 204,
                        statusText: 'No Content',
                        body: null,
                        url: req.url
                    }) as HttpEvent<any>);
                }
                
                // Para GET requests que esperam arrays, retornar array vazio
                if (req.method === 'GET' && (req.url.includes('/boards') || req.url.includes('/sessions'))) {
                    return of(new HttpResponse({
                        status: 200,
                        statusText: 'OK',
                        body: [],
                        url: req.url
                    }) as HttpEvent<any>);
                }
                
                // Para POST requests, retornar null (será tratado pelo serviço)
                if (req.method === 'POST') {
                    return of(new HttpResponse({
                        status: 503,
                        statusText: 'Service Unavailable',
                        body: null,
                        url: req.url
                    }) as HttpEvent<any>);
                }
                
                // Para outros endpoints, retornar 503 Service Unavailable
                // mas sem propagar o erro para evitar logs no console
                return of(new HttpResponse({
                    status: 503,
                    statusText: 'Service Unavailable',
                    body: null,
                    url: req.url
                }) as HttpEvent<any>);
            }
            
            // Para endpoint de sessão ativa, também tratar 204 e 404 como normais
            if (req.url.includes('/sessions/active') && (error.status === 204 || error.status === 404)) {
                return of(new HttpResponse({
                    status: 204,
                    statusText: 'No Content',
                    body: null,
                    url: req.url
                }) as HttpEvent<any>);
            }
            
            // Para outros erros, propagar normalmente
            throw error;
        })
    );
};

