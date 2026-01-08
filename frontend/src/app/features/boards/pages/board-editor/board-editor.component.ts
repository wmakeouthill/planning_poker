import { Component, inject, OnInit, signal, Input, ViewChild, ElementRef, HostListener, QueryList, ViewChildren, AfterViewInit, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';
import { SlashCommandMenuComponent, SlashCommand, ContentBlock, BlockType } from '../../components/slash-command-menu/slash-command-menu.component';
import { HighlightPipe } from '../../pipes/highlight.pipe';

interface HistoryState {
    blocks: ContentBlock[];
    focusedBlockId: string | null;
}

@Component({
    selector: 'app-board-editor',
    standalone: true,
    imports: [FormsModule, SlashCommandMenuComponent, HighlightPipe],
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
    readonly viewMode = signal<'view' | 'edit'>('view');

    // Editable fields
    readonly title = signal('');
    readonly description = signal('');

    // Block-based content
    readonly blocks = signal<ContentBlock[]>([{ id: this.generateId(), type: 'paragraph', content: '' }]);
    readonly focusedBlockId = signal<string | null>(null);

    // Track which blocks need content sync
    private needsContentSync = new Set<string>();
    private initialSyncDone = false;

    // Undo/Redo history
    private history: HistoryState[] = [];
    private historyIndex = -1;
    private isUndoingOrRedoing = false;
    private lastHistoryPush = 0;

    // Slash command state
    readonly showSlashMenu = signal(false);
    readonly slashMenuPosition = signal({ top: 0, left: 0 });
    readonly slashFilter = signal('');
    private slashBlockId: string | null = null;

    // Highlight pipe for syntax highlighting
    private readonly highlightPipe = new HighlightPipe();

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
                if (!blockId) return;
                
                const block = this.blocks().find(b => b.id === blockId);
                if (block && typeof block.content === 'string') {
                    const content = block.content;
                    // For code blocks, apply highlight if not focused
                    if (block.type === 'code' && this.focusedBlockId() !== blockId) {
                        this.applyHighlight(blockId, content, el.nativeElement);
                    } else if (el.nativeElement.innerText !== content) {
                        el.nativeElement.innerText = content;
                    }
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
                if (!blockId) return;
                
                const blockEl = this.blockElements?.find(el => el.nativeElement.dataset['blockId'] === blockId);
                const block = this.blocks().find(b => b.id === blockId);
                if (blockEl && block && typeof block.content === 'string') {
                    const content = block.content;
                    // For code blocks, apply highlight if not focused
                    if (block.type === 'code' && this.focusedBlockId() !== blockId) {
                        this.applyHighlight(blockId, content, blockEl.nativeElement);
                    } else if (blockEl.nativeElement.innerText !== content) {
                        blockEl.nativeElement.innerText = content;
                    }
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

    // ========== History Management (Undo/Redo) ==========

    private pushHistory() {
        // Debounce - don't push if less than 300ms since last push
        const now = Date.now();
        if (now - this.lastHistoryPush < 300) return;
        this.lastHistoryPush = now;

        // If we're not at the end of history, truncate
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Deep clone blocks
        const snapshot: HistoryState = {
            blocks: JSON.parse(JSON.stringify(this.blocks())),
            focusedBlockId: this.focusedBlockId()
        };

        this.history.push(snapshot);
        this.historyIndex = this.history.length - 1;

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    private undo() {
        if (this.historyIndex <= 0) return;

        this.isUndoingOrRedoing = true;
        this.historyIndex--;
        const state = this.history[this.historyIndex];

        this.blocks.set(JSON.parse(JSON.stringify(state.blocks)));
        this.focusedBlockId.set(state.focusedBlockId);

        // Sync all blocks
        state.blocks.forEach(b => this.needsContentSync.add(b.id));

        setTimeout(() => {
            this.syncAllBlockContents();
            if (state.focusedBlockId) {
                this.focusBlock(state.focusedBlockId);
            }
            this.isUndoingOrRedoing = false;
        }, 0);
    }

    private redo() {
        if (this.historyIndex >= this.history.length - 1) return;

        this.isUndoingOrRedoing = true;
        this.historyIndex++;
        const state = this.history[this.historyIndex];

        this.blocks.set(JSON.parse(JSON.stringify(state.blocks)));
        this.focusedBlockId.set(state.focusedBlockId);

        // Sync all blocks
        state.blocks.forEach(b => this.needsContentSync.add(b.id));

        setTimeout(() => {
            this.syncAllBlockContents();
            if (state.focusedBlockId) {
                this.focusBlock(state.focusedBlockId);
            }
            this.isUndoingOrRedoing = false;
        }, 0);
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
                this.viewMode.set('view'); // Switch to view mode after saving
            },
            error: () => {
                this.saving.set(false);
            }
        });
    }

    enterEditMode() {
        this.viewMode.set('edit');
        // Sync all block contents after view renders
        setTimeout(() => {
            this.blocks().forEach(b => this.needsContentSync.add(b.id));
            this.syncAllBlockContents();
            this.pushHistory();
        }, 50);
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
                const block = this.blocks().find(b => b.id === blockId);
                // For code blocks, remove highlight to allow easy editing
                if (block?.type === 'code' && typeof block.content === 'string') {
                    blockEl.nativeElement.innerText = block.content;
                }
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
        if (this.isUndoingOrRedoing) return;

        const target = event.target as HTMLDivElement;
        const content = target.innerText;

        this.blocks.update(blocks =>
            blocks.map(b => b.id === blockId ? { ...b, content } : b)
        );

        // Push history for undo/redo
        this.pushHistory();
    }

    onBlockBlur(event: Event, blockId: string) {
        const block = this.blocks().find(b => b.id === blockId);
        if (block?.type === 'code' && typeof block.content === 'string') {
            const target = event.target as HTMLDivElement;
            // Apply highlight when block loses focus
            this.applyHighlight(blockId, block.content, target);
        }
    }

    private applyHighlight(blockId: string, content: string, element: HTMLDivElement) {
        if (!content.trim()) {
            element.innerHTML = '';
            return;
        }

        // Apply highlight using PrismJS
        const highlighted = this.highlightPipe.transform(content);
        element.innerHTML = highlighted as string;
    }

    onBlockKeydown(event: KeyboardEvent, blockId: string) {
        const target = event.target as HTMLDivElement;
        const block = this.blocks().find(b => b.id === blockId);
        if (!block) return;

        // Custom undo/redo (Ctrl+Z / Ctrl+Y)
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            this.undo();
            return;
        }
        if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
            this.redo();
            return;
        }

        // Handle slash command
        if (event.key === '/' && target.innerText === '') {
            event.preventDefault();
            this.openSlashMenu(target, blockId);
            return;
        }

        // Code block: Enter creates new empty block, doesn't carry content
        if (block.type === 'code' && event.key === 'Enter' && !event.shiftKey) {
            // Update code block content first
            this.blocks.update(blocks =>
                blocks.map(b => b.id === blockId ? { ...b, content: target.innerText } : b)
            );

            event.preventDefault();
            const newBlock: ContentBlock = {
                id: this.generateId(),
                type: 'paragraph',
                content: ''
            };

            this.needsContentSync.add(newBlock.id);

            this.blocks.update(blocks => {
                const index = blocks.findIndex(b => b.id === blockId);
                const newBlocks = [...blocks];
                newBlocks.splice(index + 1, 0, newBlock);
                return newBlocks;
            });

            this.pushHistory();
            setTimeout(() => this.focusBlock(newBlock.id), 0);
            return;
        }

        // Regular blocks: Enter creates new block (unless shift held)
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

            this.pushHistory();

            // Focus new block
            setTimeout(() => this.focusBlock(newBlock.id), 0);
            return;
        }

        // Backspace at start - merge with previous block or change type, or delete empty block
        if (event.key === 'Backspace') {
            const selection = window.getSelection();
            const cursorAtStart = selection?.anchorOffset === 0;
            const blocks = this.blocks();
            const index = blocks.findIndex(b => b.id === blockId);
            const isEmpty = target.innerText.trim() === '';

            // Delete empty block (not the first one)
            if (isEmpty && index > 0) {
                event.preventDefault();
                const prevBlock = blocks[index - 1];

                this.blocks.update(bs => bs.filter(b => b.id !== blockId));
                this.pushHistory();

                setTimeout(() => {
                    if (prevBlock.type !== 'divider') {
                        this.focusBlockAtPosition(prevBlock.id, prevBlock.content.length);
                    } else if (index > 1) {
                        this.focusBlock(blocks[index - 2].id);
                    }
                }, 0);
                return;
            }

            if (cursorAtStart) {
                // If block is not paragraph, convert to paragraph first
                if (block.type !== 'paragraph') {
                    event.preventDefault();
                    this.blocks.update(bs =>
                        bs.map(b => b.id === blockId ? { ...b, type: 'paragraph' as BlockType } : b)
                    );
                    this.pushHistory();
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

                        this.pushHistory();

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
            if (!blockEl) return;

            blockEl.nativeElement.focus();

            const firstChild = blockEl.nativeElement.firstChild;
            if (!firstChild || firstChild.nodeType !== Node.TEXT_NODE) {
                // No text node, just focus the element
                return;
            }

            try {
                const range = document.createRange();
                const sel = window.getSelection();
                const textLength = firstChild.textContent?.length || 0;
                const safePos = Math.min(Math.max(0, position), textLength);

                range.setStart(firstChild, safePos);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
            } catch (e) {
                // Fallback: just focus without cursor positioning
                console.warn('Could not set cursor position:', e);
            }
        }, 10);
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
