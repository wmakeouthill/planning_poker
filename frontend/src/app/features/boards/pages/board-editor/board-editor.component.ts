import { Component, inject, OnInit, signal, Input, ViewChild, ElementRef, HostListener, QueryList, ViewChildren, AfterViewInit, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';
import { SlashCommandMenuComponent, SlashCommand, ContentBlock, BlockType } from '../../components/slash-command-menu/slash-command-menu.component';

@Component({
    selector: 'app-board-editor',
    standalone: true,
    imports: [FormsModule, SlashCommandMenuComponent],
    templateUrl: './board-editor.component.html',
    styleUrl: './board-editor.component.css'
})
export class BoardEditorComponent implements OnInit, AfterViewInit, AfterViewChecked {
    @Input() id!: string;
    @ViewChildren('blockElement') blockElements!: QueryList<ElementRef<HTMLDivElement>>;

    private readonly boardService = inject(BoardService);
    private readonly router = inject(Router);

    readonly board = signal<Board | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);

    // Editable fields
    readonly title = signal('');
    readonly description = signal('');

    // Block-based content
    readonly blocks = signal<ContentBlock[]>([{ id: this.generateId(), type: 'paragraph', content: '' }]);
    readonly focusedBlockId = signal<string | null>(null);

    // Track which blocks need content sync
    private needsContentSync = new Set<string>();
    private initialSyncDone = false;

    // Slash command state
    readonly showSlashMenu = signal(false);
    readonly slashMenuPosition = signal({ top: 0, left: 0 });
    readonly slashFilter = signal('');
    private slashBlockId: string | null = null;

    ngOnInit() {
        if (this.id) {
            this.loadBoard(Number(this.id));
        }
    }

    ngAfterViewInit() {
        // Initial sync for all blocks after load
        this.syncAllBlockContents();
    }

    ngAfterViewChecked() {
        // Sync only blocks that need it
        if (this.needsContentSync.size > 0) {
            this.syncPendingBlocks();
        }
    }

    private syncAllBlockContents() {
        setTimeout(() => {
            this.blockElements?.forEach(el => {
                const blockId = el.nativeElement.dataset['blockId'];
                const block = this.blocks().find(b => b.id === blockId);
                if (block && el.nativeElement.innerText !== block.content) {
                    el.nativeElement.innerText = block.content;
                }
            });
            this.initialSyncDone = true;
        }, 0);
    }

    private syncPendingBlocks() {
        const toSync = Array.from(this.needsContentSync);
        this.needsContentSync.clear();

        setTimeout(() => {
            toSync.forEach(blockId => {
                const blockEl = this.blockElements?.find(el => el.nativeElement.dataset['blockId'] === blockId);
                const block = this.blocks().find(b => b.id === blockId);
                if (blockEl && block && blockEl.nativeElement.innerText !== block.content) {
                    blockEl.nativeElement.innerText = block.content;
                }
            });
        }, 0);
    }

    private generateId(): string {
        return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private loadBoard(id: number) {
        this.loading.set(true);
        this.boardService.buscarPorId(id).subscribe({
            next: (board) => {
                this.board.set(board);
                this.title.set(board.title);
                this.description.set(board.description || '');

                // Parse content to blocks
                if (board.content) {
                    const parsedBlocks = this.parseContentToBlocks(board.content);
                    this.blocks.set(parsedBlocks);
                    // Mark all for initial sync
                    parsedBlocks.forEach(b => this.needsContentSync.add(b.id));
                } else {
                    this.blocks.set([{ id: this.generateId(), type: 'paragraph', content: '' }]);
                }

                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.router.navigate(['/boards']);
            }
        });
    }

    private parseContentToBlocks(content: string): ContentBlock[] {
        const lines = content.split('\n');
        const blocks: ContentBlock[] = [];

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            // Code block
            if (line.startsWith('```')) {
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                blocks.push({ id: this.generateId(), type: 'code', content: codeLines.join('\n') });
                i++; // skip closing ```
                continue;
            }

            // Divider
            if (line.trim() === '---') {
                blocks.push({ id: this.generateId(), type: 'divider', content: '' });
                i++;
                continue;
            }

            // Headings
            if (line.startsWith('### ')) {
                blocks.push({ id: this.generateId(), type: 'heading3', content: line.substring(4) });
                i++;
                continue;
            }
            if (line.startsWith('## ')) {
                blocks.push({ id: this.generateId(), type: 'heading2', content: line.substring(3) });
                i++;
                continue;
            }
            if (line.startsWith('# ')) {
                blocks.push({ id: this.generateId(), type: 'heading1', content: line.substring(2) });
                i++;
                continue;
            }

            // Quote
            if (line.startsWith('> ')) {
                blocks.push({ id: this.generateId(), type: 'quote', content: line.substring(2) });
                i++;
                continue;
            }

            // Todo
            if (line.startsWith('- [x] ')) {
                blocks.push({ id: this.generateId(), type: 'todo', content: line.substring(6), checked: true });
                i++;
                continue;
            }
            if (line.startsWith('- [ ] ')) {
                blocks.push({ id: this.generateId(), type: 'todo', content: line.substring(6), checked: false });
                i++;
                continue;
            }

            // Bullet list
            if (line.startsWith('- ')) {
                blocks.push({ id: this.generateId(), type: 'bullet-list', content: line.substring(2) });
                i++;
                continue;
            }

            // Numbered list
            if (/^\d+\. /.test(line)) {
                const match = line.match(/^\d+\. (.*)$/);
                if (match) {
                    blocks.push({ id: this.generateId(), type: 'numbered-list', content: match[1] });
                }
                i++;
                continue;
            }

            // Regular paragraph
            if (line.trim()) {
                blocks.push({ id: this.generateId(), type: 'paragraph', content: line });
            }
            i++;
        }

        // Ensure at least one empty block
        if (blocks.length === 0) {
            blocks.push({ id: this.generateId(), type: 'paragraph', content: '' });
        }

        return blocks;
    }

    private blocksToMarkdown(): string {
        return this.blocks().map(block => {
            switch (block.type) {
                case 'heading1': return `# ${block.content}`;
                case 'heading2': return `## ${block.content}`;
                case 'heading3': return `### ${block.content}`;
                case 'quote': return `> ${block.content}`;
                case 'bullet-list': return `- ${block.content}`;
                case 'numbered-list': return `1. ${block.content}`;
                case 'todo': return `- [${block.checked ? 'x' : ' '}] ${block.content}`;
                case 'code': return `\`\`\`\n${block.content}\n\`\`\``;
                case 'divider': return '---';
                default: return block.content;
            }
        }).join('\n');
    }

    save() {
        if (!this.board()) return;

        this.saving.set(true);
        const content = this.blocksToMarkdown();

        this.boardService.atualizar(this.board()!.id, {
            title: this.title(),
            description: this.description(),
            content: content
        }).subscribe({
            next: () => {
                this.saving.set(false);
            },
            error: () => {
                this.saving.set(false);
            }
        });
    }

    goBack() {
        this.router.navigate(['/boards']);
    }

    // ========== Block Operations ==========

    focusBlock(blockId: string) {
        this.focusedBlockId.set(blockId);
        setTimeout(() => {
            const blockEl = this.blockElements?.find(el => el.nativeElement.dataset['blockId'] === blockId);
            if (blockEl) {
                blockEl.nativeElement.focus();
                // Move cursor to end
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(blockEl.nativeElement);
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }, 0);
    }

    onBlockInput(event: Event, blockId: string) {
        const target = event.target as HTMLDivElement;
        const content = target.innerText;

        this.blocks.update(blocks =>
            blocks.map(b => b.id === blockId ? { ...b, content } : b)
        );
    }

    onBlockKeydown(event: KeyboardEvent, blockId: string) {
        const target = event.target as HTMLDivElement;
        const block = this.blocks().find(b => b.id === blockId);
        if (!block) return;

        // Handle slash command
        if (event.key === '/' && target.innerText === '') {
            event.preventDefault();
            this.openSlashMenu(target, blockId);
            return;
        }

        // Enter - create new block
        if (event.key === 'Enter' && !event.shiftKey && !this.showSlashMenu()) {
            event.preventDefault();

            // Get cursor position
            const selection = window.getSelection();
            const cursorPos = selection?.anchorOffset || 0;
            const fullText = target.innerText;

            // Split content at cursor
            const beforeCursor = fullText.substring(0, cursorPos);
            const afterCursor = fullText.substring(cursorPos);

            // Update current block content in DOM directly (avoid sync loop)
            target.innerText = beforeCursor;

            // Update signal state
            this.blocks.update(blocks =>
                blocks.map(b => b.id === blockId ? { ...b, content: beforeCursor } : b)
            );

            // Create new block with content after cursor
            const newBlock: ContentBlock = {
                id: this.generateId(),
                type: 'paragraph',
                content: afterCursor
            };

            // Mark new block for content sync
            this.needsContentSync.add(newBlock.id);

            this.blocks.update(blocks => {
                const index = blocks.findIndex(b => b.id === blockId);
                const newBlocks = [...blocks];
                newBlocks.splice(index + 1, 0, newBlock);
                return newBlocks;
            });

            // Focus new block
            setTimeout(() => this.focusBlock(newBlock.id), 0);
            return;
        }

        // Backspace at start - merge with previous block or change type
        if (event.key === 'Backspace') {
            const selection = window.getSelection();
            const cursorAtStart = selection?.anchorOffset === 0;

            if (cursorAtStart) {
                const blocks = this.blocks();
                const index = blocks.findIndex(b => b.id === blockId);

                // If block is not paragraph, convert to paragraph first
                if (block.type !== 'paragraph') {
                    event.preventDefault();
                    this.blocks.update(bs =>
                        bs.map(b => b.id === blockId ? { ...b, type: 'paragraph' as BlockType } : b)
                    );
                    return;
                }

                // Merge with previous block
                if (index > 0) {
                    event.preventDefault();
                    const prevBlock = blocks[index - 1];
                    if (prevBlock.type !== 'divider') {
                        const prevContent = prevBlock.content;
                        const currentContent = block.content;

                        this.blocks.update(bs => {
                            const newBlocks = bs.filter(b => b.id !== blockId);
                            return newBlocks.map(b =>
                                b.id === prevBlock.id
                                    ? { ...b, content: prevContent + currentContent }
                                    : b
                            );
                        });

                        // Focus previous block at merge point
                        setTimeout(() => {
                            this.focusBlockAtPosition(prevBlock.id, prevContent.length);
                        }, 0);
                    }
                }
            }
        }

        // Arrow Up/Down - navigate blocks
        if (event.key === 'ArrowUp' && !this.showSlashMenu()) {
            const selection = window.getSelection();
            const atStart = selection?.anchorOffset === 0;
            if (atStart) {
                event.preventDefault();
                const blocks = this.blocks();
                const index = blocks.findIndex(b => b.id === blockId);
                if (index > 0) {
                    this.focusBlock(blocks[index - 1].id);
                }
            }
        }

        if (event.key === 'ArrowDown' && !this.showSlashMenu()) {
            const selection = window.getSelection();
            const atEnd = selection?.anchorOffset === target.innerText.length;
            if (atEnd) {
                event.preventDefault();
                const blocks = this.blocks();
                const index = blocks.findIndex(b => b.id === blockId);
                if (index < blocks.length - 1) {
                    this.focusBlock(blocks[index + 1].id);
                }
            }
        }
    }

    private focusBlockAtPosition(blockId: string, position: number) {
        setTimeout(() => {
            const blockEl = this.blockElements?.find(el => el.nativeElement.dataset['blockId'] === blockId);
            if (blockEl && blockEl.nativeElement.firstChild) {
                const range = document.createRange();
                const sel = window.getSelection();
                const textNode = blockEl.nativeElement.firstChild;
                const safePos = Math.min(position, textNode.textContent?.length || 0);
                range.setStart(textNode, safePos);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
                blockEl.nativeElement.focus();
            }
        }, 0);
    }

    toggleTodo(blockId: string) {
        this.blocks.update(blocks =>
            blocks.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b)
        );
    }

    // ========== Slash Command Logic ==========

    private openSlashMenu(element: HTMLElement, blockId: string) {
        const rect = element.getBoundingClientRect();
        this.slashMenuPosition.set({
            top: rect.bottom + 5,
            left: rect.left
        });
        this.slashBlockId = blockId;
        this.slashFilter.set('');
        this.showSlashMenu.set(true);
    }

    onCommandSelected(command: SlashCommand) {
        if (this.slashBlockId) {
            this.blocks.update(blocks =>
                blocks.map(b =>
                    b.id === this.slashBlockId
                        ? { ...b, type: command.blockType, content: '' }
                        : b
                )
            );

            setTimeout(() => {
                if (this.slashBlockId) {
                    this.focusBlock(this.slashBlockId);
                }
            }, 0);
        }
        this.closeSlashMenu();
    }

    closeSlashMenu() {
        this.showSlashMenu.set(false);
        this.slashFilter.set('');
        this.slashBlockId = null;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (this.showSlashMenu()) {
            const target = event.target as HTMLElement;
            if (!target.closest('.slash-menu') && !target.closest('.block-content')) {
                this.closeSlashMenu();
            }
        }
    }

    getBlockClasses(block: ContentBlock): string {
        return `block-content block-${block.type}`;
    }

    getBlockPlaceholder(block: ContentBlock): string {
        switch (block.type) {
            case 'heading1': return 'Título 1';
            case 'heading2': return 'Título 2';
            case 'heading3': return 'Título 3';
            case 'quote': return 'Citação...';
            case 'bullet-list': return 'Item da lista';
            case 'numbered-list': return 'Item numerado';
            case 'todo': return 'Tarefa';
            case 'code': return 'Código...';
            default: return "Digite '/' para comandos...";
        }
    }

    trackByBlockId(index: number, block: ContentBlock): string {
        return block.id;
    }

    getNumberedIndex(blockId: string): number {
        const blocks = this.blocks();
        let count = 1;
        for (const block of blocks) {
            if (block.id === blockId) return count;
            if (block.type === 'numbered-list') count++;
        }
        return count;
    }
}
