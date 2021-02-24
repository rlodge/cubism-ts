import { event, select } from 'd3-selection';
import { Context } from './context';

export interface KeyDownModifiers {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export class KeyDown {
  private static modifiersMatch(
    event: KeyboardEvent,
    applicableModifiers: KeyDownModifiers
  ): boolean {
    return (
      event.altKey === !!applicableModifiers.altKey &&
      event.ctrlKey === !!applicableModifiers.ctrlKey &&
      event.metaKey === !!applicableModifiers.metaKey &&
      event.shiftKey === !!applicableModifiers.shiftKey
    );
  }
  private enabled = false;

  constructor(private context: Context, private keyDownIdentifier: string) {}

  enable(modifiers: KeyDownModifiers): KeyDown {
    const applicableModifiers = modifiers || {
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    };

    if (this.enabled) {
      this.disable();
    }

    select(window).on(this.keyDownIdentifier, () => {
      if (KeyDown.modifiersMatch(event, applicableModifiers)) {
        const currentFocus = this.context.focus();
        switch (event.code) {
          case 'ArrowLeft':
            if (currentFocus == null) {
              this.context.focus(this.context.size() - 1);
            } else if (currentFocus > 0) {
              this.context.focus(currentFocus - 1);
            }
            break;
          case 'ArrowRight':
            if (currentFocus == null) {
              this.context.focus(0);
            } else if (currentFocus < this.context.size() - 1) {
              this.context.focus(currentFocus + 1);
            }
            break;
          default:
            return;
        }
      } else {
        return;
      }

      event.preventDefault();
    });

    return this;
  }

  disable(): KeyDown {
    if (this.enabled) {
      select(window).on(this.keyDownIdentifier, null);
      this.enabled = false;
    }

    return this;
  }
}
