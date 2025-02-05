import { t } from "@lingui/macro";

import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

import { EVENT_REFRESH } from "../../constants";
import { ModalButton } from "../buttons/ModalButton";
import "../buttons/SpinnerButton";
import { MessageLevel } from "../messages/Message";
import { showMessage } from "../messages/MessageContainer";

@customElement("ak-forms-confirm")
export class ConfirmationForm extends ModalButton {
    @property()
    successMessage!: string;
    @property()
    errorMessage!: string;

    @property()
    action!: string;

    @property({ attribute: false })
    onConfirm!: () => Promise<unknown>;

    confirm(): Promise<void> {
        return this.onConfirm()
            .then(() => {
                this.onSuccess();
                this.open = false;
                this.dispatchEvent(
                    new CustomEvent(EVENT_REFRESH, {
                        bubbles: true,
                        composed: true,
                    }),
                );
            })
            .catch((e) => {
                this.onError(e);
                throw e;
            });
    }

    onSuccess(): void {
        showMessage({
            message: this.successMessage,
            level: MessageLevel.success,
        });
    }

    onError(e: Error): void {
        showMessage({
            message: t`${this.errorMessage}: ${e.toString()}`,
            level: MessageLevel.error,
        });
    }

    renderModalInner(): TemplateResult {
        return html`<section class="pf-c-page__main-section pf-m-light">
                <div class="pf-c-content">
                    <h1 class="pf-c-title pf-m-2xl">
                        <slot name="header"></slot>
                    </h1>
                </div>
            </section>
            <section class="pf-c-page__main-section pf-m-light">
                <form class="pf-c-form pf-m-horizontal">
                    <slot class="pf-c-content" name="body"></slot>
                </form>
            </section>
            <footer class="pf-c-modal-box__footer">
                <ak-spinner-button
                    .callAction=${() => {
                        return this.confirm();
                    }}
                    class="pf-m-danger"
                >
                    ${this.action} </ak-spinner-button
                >&nbsp;
                <ak-spinner-button
                    .callAction=${async () => {
                        this.open = false;
                    }}
                    class="pf-m-secondary"
                >
                    ${t`Cancel`}
                </ak-spinner-button>
            </footer>`;
    }
}
