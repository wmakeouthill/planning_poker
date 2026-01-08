import { Component, Input, Output, EventEmitter, signal, computed, HostListener, ElementRef, inject } from '@angular/core';

export interface SlashCommand {
    id: string;
    icon: string;
    title: string;
    description: string;
    syntax: string;
    category: 'basic' | 'lists' | 'advanced';
}

export const SLASH_COMMANDS: SlashCommand[] = [
    // Basic
    { id: 'h1', icon: 'H1', title: 'Heading 1', description: 'Título principal', syntax: '# ', category: 'basic' },
    { id: 'h2', icon: 'H2', title: 'Heading 2', description: 'Subtítulo', syntax: '## ', category: 'basic' },
    { id: 'h3', icon: 'H3', title: 'Heading 3', description: 'Seção', syntax: '### ', category: 'basic' },
    { id: 'quote', icon: '❝', title: 'Quote', description: 'Citação ou destaque', syntax: '> ', category: 'basic' },
    { id: 'divider', icon: '—', title: 'Divider', description: 'Linha divisória', syntax: '---\n', category: 'basic' },

    // Lists
    { id: 'bullet', icon: '•', title: 'Bullet List', description: 'Lista não ordenada', syntax: '- ', category: 'lists' },
    { id: 'numbered', icon: '1.', title: 'Numbered List', description: 'Lista ordenada', syntax: '1. ', category: 'lists' },
    { id: 'todo', icon: '☐', title: 'To-do', description: 'Checkbox de tarefa', syntax: '- [ ] ', category: 'lists' },

    // Advanced
    { id: 'code', icon: '<>', title: 'Code Block', description: 'Bloco de código', syntax: '```\n\n```', category: 'advanced' },
    { id: 'inline-code', icon: '`', title: 'Inline Code', description: 'Código inline', syntax: '`código`', category: 'advanced' },
    { id: 'bold', icon: 'B', title: 'Bold', description: 'Texto em negrito', syntax: '**texto**', category: 'advanced' },
    { id: 'italic', icon: 'I', title: 'Italic', description: 'Texto em itálico', syntax: '*texto*', category: 'advanced' },
    { id: 'link', icon: '🔗', title: 'Link', description: 'Hyperlink', syntax: '[texto](url)', category: 'advanced' },
];

@Component({
    selector: 'app-slash-command-menu',
    standalone: true,
    imports: [],
    templateUrl: './slash-command-menu.component.html',
    styleUrl: './slash-command-menu.component.css'
})
export class SlashCommandMenuComponent {
    private readonly elementRef = inject(ElementRef);

    @Input() set filter(value: string) {
        this.filterText.set(value.toLowerCase());
    }
    @Input() positionTop = 0;
    @Input() positionLeft = 0;

    @Output() commandSelected = new EventEmitter<SlashCommand>();
    @Output() closed = new EventEmitter<void>();

    readonly filterText = signal('');
    readonly selectedIndex = signal(0);

    readonly filteredCommands = computed(() => {
        const filter = this.filterText();
        if (!filter) return SLASH_COMMANDS;
        return SLASH_COMMANDS.filter(cmd =>
            cmd.title.toLowerCase().includes(filter) ||
            cmd.description.toLowerCase().includes(filter) ||
            cmd.id.includes(filter)
        );
    });

    readonly groupedCommands = computed(() => {
        const commands = this.filteredCommands();
        const groups: { category: string; label: string; commands: SlashCommand[] }[] = [];

        const basic = commands.filter(c => c.category === 'basic');
        const lists = commands.filter(c => c.category === 'lists');
        const advanced = commands.filter(c => c.category === 'advanced');

        if (basic.length) groups.push({ category: 'basic', label: 'Básico', commands: basic });
        if (lists.length) groups.push({ category: 'lists', label: 'Listas', commands: lists });
        if (advanced.length) groups.push({ category: 'advanced', label: 'Avançado', commands: advanced });

        return groups;
    });

    @HostListener('document:keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent) {
        const commands = this.filteredCommands();
        if (!commands.length) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedIndex.update(i => (i + 1) % commands.length);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.selectedIndex.update(i => (i - 1 + commands.length) % commands.length);
                break;
            case 'Enter':
                event.preventDefault();
                this.selectCommand(commands[this.selectedIndex()]);
                break;
            case 'Escape':
                event.preventDefault();
                this.closed.emit();
                break;
        }
    }

    selectCommand(command: SlashCommand) {
        this.commandSelected.emit(command);
    }

    getOverallIndex(command: SlashCommand): number {
        return this.filteredCommands().indexOf(command);
    }

    isSelected(command: SlashCommand): boolean {
        return this.getOverallIndex(command) === this.selectedIndex();
    }
}
