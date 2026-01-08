import { Component, output, Input, signal } from '@angular/core';

interface EmojiCategory {
    name: string;
    emojis: string[];
}

/**
 * Componente de carrossel de emojis para seleção com dropdown de categorias.
 */
@Component({
    selector: 'app-emoji-carousel',
    standalone: true,
    templateUrl: './emoji-carousel.component.html',
    styleUrl: './emoji-carousel.component.css'
})
export class EmojiCarouselComponent {
    @Input() selectedEmoji = '🗞️';

    readonly emojiSelected = output<string>();
    readonly showDropdown = signal(false);

    readonly categories: EmojiCategory[] = [
        { name: 'Objetos', emojis: ['🗞️', '🪨', '🍅', '👞', '💣', '🥊', '💩', '🗿', '🧱', '🥚'] },
        { name: 'Esportes', emojis: ['🎱', '⚽', '🏀', '🏈', '⚾', '🥎', '🎳', '🏐', '🏉', '🎾'] },
        { name: 'Calçados', emojis: ['🥾', '🧦', '👟', '👠', '🩴', '👢', '🧤'] },
        { name: 'Armas', emojis: ['🔫', '🪃', '🏹', '🎯', '💥', '🧨', '🎆', '🎇'] },
        { name: 'Comidas', emojis: ['🥧', '🍰', '🧁', '🍩', '🥐', '🌽', '🥒', '🍌', '🥑', '🍳'] },
        { name: 'Animais', emojis: ['🐔', '🦆', '🐸', '🦀', '🐙', '🐟', '🦐', '🐍', '🦎'] },
        { name: 'Caras', emojis: ['🤡', '👻', '💀', '🎃', '👽', '🤖', '😈', '👹', '👺'] },
        { name: 'Gestos', emojis: ['👊', '🤛', '🤜', '👋', '🖐️', '✋', '🤚', '👍', '👎', '🖕'] },
        { name: 'Símbolos', emojis: ['💔', '❤️', '🔥', '⚡', '💫', '⭐', '🌟', '✨'] },
        { name: 'Bandeiras', emojis: ['🇧🇷', '🏴‍☠️', '🚩', '🏳️', '🎌'] }
    ];

    // Emojis rápidos (favoritos)
    readonly quickEmojis = ['🗞️', '🪨', '🍅', '💣', '💩', '🗿', '👞', '🥊'];

    selectEmoji(emoji: string): void {
        this.emojiSelected.emit(emoji);
        this.showDropdown.set(false);
    }

    toggleDropdown(): void {
        this.showDropdown.update(v => !v);
    }

    closeDropdown(): void {
        this.showDropdown.set(false);
    }
}
