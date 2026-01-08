import { Component, signal, output, Input } from '@angular/core';

/**
 * Componente de carrossel de emojis para seleção.
 * Responsabilidade única: permitir seleção de emoji para arremessar.
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
    
    readonly emojis = [
        '📄', '🗞️', '🎯', '🎉', '👏', 
        '🔥', '❤️', '😂', '🤔', '💩',
        '👍', '👎', '🎈', '⚡', '💡'
    ];
    
    selectEmoji(emoji: string): void {
        this.emojiSelected.emit(emoji);
    }
}
