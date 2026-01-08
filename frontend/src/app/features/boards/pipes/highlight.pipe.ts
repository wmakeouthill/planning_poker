import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Prism from 'prismjs';

// Import common languages
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-rust';

@Pipe({
    name: 'highlight',
    standalone: true
})
export class HighlightPipe implements PipeTransform {
    private readonly sanitizer = inject(DomSanitizer);

    transform(code: string, language?: string): SafeHtml {
        if (!code) return '';

        // Auto-detect language or use provided
        const lang = language || this.detectLanguage(code);
        const grammar = Prism.languages[lang];

        if (grammar) {
            const highlighted = Prism.highlight(code, grammar, lang);
            return this.sanitizer.bypassSecurityTrustHtml(highlighted);
        }

        // Fallback: escape HTML and return
        return this.escapeHtml(code);
    }

    private detectLanguage(code: string): string {
        // Simple heuristics for language detection
        if (code.includes('function') || code.includes('const ') || code.includes('let ')) {
            if (code.includes(': ') && (code.includes('interface ') || code.includes('type '))) {
                return 'typescript';
            }
            return 'javascript';
        }
        if (code.includes('public class') || code.includes('private ') || code.includes('void ')) {
            return 'java';
        }
        if (code.includes('def ') || code.includes('import ') && code.includes(':')) {
            return 'python';
        }
        if (code.includes('SELECT') || code.includes('INSERT') || code.includes('FROM')) {
            return 'sql';
        }
        if (code.startsWith('{') || code.startsWith('[')) {
            return 'json';
        }
        if (code.includes('docker') || code.includes('FROM ') || code.includes('RUN ')) {
            return 'docker';
        }
        if (code.includes('#!/bin/bash') || code.includes('echo ') || code.includes('sudo ')) {
            return 'bash';
        }

        return 'markup'; // Default fallback
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
