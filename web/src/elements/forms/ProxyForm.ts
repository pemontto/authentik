import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

import { Form } from "./Form";

@customElement("ak-proxy-form")
export class ProxyForm extends Form<unknown> {
    @property()
    type!: string;

    @property({ attribute: false })
    args: Record<string, unknown> = {};

    @property({ attribute: false })
    typeMap: Record<string, string> = {};

    innerElement?: Form<unknown>;

    submit(ev: Event): Promise<unknown> | undefined {
        return this.innerElement?.submit(ev);
    }

    resetForm(): void {
        this.innerElement?.resetForm();
    }

    getSuccessMessage(): string {
        return this.innerElement?.getSuccessMessage() || "";
    }

    async requestUpdate(name?: PropertyKey | undefined, oldValue?: unknown): Promise<unknown> {
        const result = await super.requestUpdate(name, oldValue);
        await this.innerElement?.requestUpdate();
        return result;
    }

    renderVisible(): TemplateResult {
        let elementName = this.type;
        if (this.type in this.typeMap) {
            elementName = this.typeMap[this.type];
        }
        this.innerElement = document.createElement(elementName) as Form<unknown>;
        for (const k in this.args) {
            this.innerElement.setAttribute(k, this.args[k] as string);
            (this.innerElement as unknown as Record<string, unknown>)[k] = this.args[k];
        }
        return html`${this.innerElement}`;
    }
}
