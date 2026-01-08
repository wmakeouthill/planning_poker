import { Component, output, Input, signal, ElementRef, viewChild, AfterViewInit } from '@angular/core';

interface EmojiCategory {
    name: string;
    emojis: string[];
}

/**
 * Componente de carrossel de emojis para seleção com dropdown de categorias.
 * Suporta arrastar para rolar horizontalmente.
 */
@Component({
    selector: 'app-emoji-carousel',
    standalone: true,
    templateUrl: './emoji-carousel.component.html',
    styleUrl: './emoji-carousel.component.css'
})
export class EmojiCarouselComponent implements AfterViewInit {
    @Input() selectedEmoji = '🗞️';

    readonly emojiSelected = output<string>();
    readonly showDropdown = signal(false);

    private emojiListRef = viewChild<ElementRef>('emojiList');
    private isDragging = false;
    private startX = 0;
    private scrollLeft = 0;

    readonly categories: EmojiCategory[] = [
        { name: 'Objetos', emojis: ['🗞️', '🪨', '🍅', '👞', '💣', '🥊', '💩', '🗿', '🧱', '🥚', '🔨', '🪓', '⛏️', '🔧', '🪛', '🔩', '🪤', '🧲', '🪣', '🧹'] },
        { name: 'Esportes', emojis: ['🎱', '⚽', '🏀', '🏈', '⚾', '🥎', '🎳', '🏐', '🏉', '🎾', '🥏', '🏓', '🏸', '🥅', '⛳', '🏒', '🥍', '🏏', '🪀', '🎿'] },
        { name: 'Calçados', emojis: ['🥾', '🧦', '👟', '👠', '🩴', '👢', '🧤', '👡', '👞', '🥿', '👒', '🎩', '🧢', '⛑️', '👑', '💍', '👜', '🎒', '👛', '🧳'] },
        { name: 'Armas', emojis: ['🔫', '🪃', '🏹', '🎯', '💥', '🧨', '🎆', '🎇', '✂️', '🗡️', '⚔️', '🛡️', '🔪', '🪚', '💉', '🧪', '🧫', '🧬', '🔬', '🔭'] },
        { name: 'Comidas', emojis: ['🥧', '🍰', '🧁', '🍩', '🥐', '🌽', '🥒', '🍌', '🥑', '🍳', '🍕', '🍔', '🌭', '🥪', '🌮', '🌯', '🥗', '🍜', '🍣', '🍤', '🍪', '🍫', '🍬', '🍭', '🎂'] },
        { name: 'Animais', emojis: ['🐔', '🦆', '🐸', '🦀', '🐙', '🐟', '🦐', '🐍', '🦎', '🐊', '🐢', '🦖', '🦕', '🐳', '🦈', '🐬', '🐠', '🐡', '🦑', '🦞', '🐌', '🦋', '🐛', '🐜', '🐝'] },
        { name: 'Caras', emojis: ['🤡', '👻', '💀', '🎃', '👽', '🤖', '😈', '👹', '👺', '😀', '😂', '🤣', '😭', '😱', '🤢', '🤮', '🥴', '🤯', '😵', '🥶', '🥵', '😤', '😡', '🤬', '💩'] },
        { name: 'Gestos', emojis: ['👊', '🤛', '🤜', '👋', '🖐️', '✋', '🤚', '👍', '👎', '🖕', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✊', '👏', '🙌', '🤝', '🙏'] },
        { name: 'Símbolos', emojis: ['💔', '❤️', '🔥', '⚡', '💫', '⭐', '🌟', '✨', '💥', '💢', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗯️', '💭', '💤', '💯', '🔴', '🟠', '🟡', '🟢', '🔵'] },
        { name: 'Bandeiras', emojis: ['🇧🇷', '🏴‍☠️', '🚩', '🏳️', '🎌', '🇦🇷', '🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇪🇸', '🇮🇹', '🇵🇹', '🇯🇵', '🇰🇷', '🇨🇳', '🇷🇺', '🇲🇽', '🇨🇦', '🇦🇺'] }
    ];

    get allEmojis(): string[] {
        return this.categories.flatMap(c => c.emojis);
    }

    ngAfterViewInit(): void {
        this.setupDragScroll();
    }

    private setupDragScroll(): void {
        const el = this.emojiListRef()?.nativeElement;
        if (!el) return;

        el.addEventListener('mousedown', (e: MouseEvent) => {
            this.isDragging = true;
            el.classList.add('dragging');
            this.startX = e.pageX - el.offsetLeft;
            this.scrollLeft = el.scrollLeft;
        });

        el.addEventListener('mouseleave', () => {
            this.isDragging = false;
            el.classList.remove('dragging');
        });

        el.addEventListener('mouseup', () => {
            this.isDragging = false;
            el.classList.remove('dragging');
        });

        el.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const x = e.pageX - el.offsetLeft;
            const walk = (x - this.startX) * 2;
            el.scrollLeft = this.scrollLeft - walk;
        });
    }

    selectEmoji(emoji: string): void {
        if (!this.isDragging) {
            this.emojiSelected.emit(emoji);
        }
        this.showDropdown.set(false);
    }

    toggleDropdown(): void {
        this.showDropdown.update(v => !v);
    }

    closeDropdown(): void {
        this.showDropdown.set(false);
    }
}
