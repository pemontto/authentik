import { t } from "@lingui/macro";

import { CSSResult, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

import AKGlobal from "../../authentik.css";
import PFBase from "@patternfly/patternfly/patternfly-base.css";

import { OutpostHealth } from "@goauthentik/api";

import { PFColor } from "../../elements/Label";
import "../../elements/Spinner";

@customElement("ak-outpost-health")
export class OutpostHealthElement extends LitElement {
    @property({ attribute: false })
    outpostHealth?: OutpostHealth;

    static get styles(): CSSResult[] {
        return [PFBase, AKGlobal];
    }

    render(): TemplateResult {
        if (!this.outpostHealth) {
            return html`<ak-spinner></ak-spinner>`;
        }
        return html` <ul>
            <li role="cell">
                <ak-label
                    color=${PFColor.Green}
                    text=${t`Last seen: ${this.outpostHealth.lastSeen?.toLocaleTimeString()}`}
                ></ak-label>
            </li>
            <li role="cell">
                ${this.outpostHealth.versionOutdated
                    ? html`<ak-label
                          color=${PFColor.Red}
                          text=${t`${this.outpostHealth.version}, should be ${this.outpostHealth.versionShould}`}
                      ></ak-label>`
                    : html`<ak-label
                          color=${PFColor.Green}
                          text=${t`Version: ${this.outpostHealth.version || ""}`}
                      ></ak-label>`}
            </li>
        </ul>`;
    }
}
