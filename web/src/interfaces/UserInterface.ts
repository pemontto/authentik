import { t } from "@lingui/macro";

import { css, CSSResult, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";

import AKGlobal from "../authentik.css";
import PFAvatar from "@patternfly/patternfly/components/Avatar/avatar.css";
import PFBrand from "@patternfly/patternfly/components/Brand/brand.css";
import PFButton from "@patternfly/patternfly/components/Button/button.css";
import PFDrawer from "@patternfly/patternfly/components/Drawer/drawer.css";
import PFDropdown from "@patternfly/patternfly/components/Dropdown/dropdown.css";
import PFNotificationBadge from "@patternfly/patternfly/components/NotificationBadge/notification-badge.css";
import PFPage from "@patternfly/patternfly/components/Page/page.css";
import PFBase from "@patternfly/patternfly/patternfly-base.css";

import { CurrentTenant, EventsApi } from "@goauthentik/api";

import { DEFAULT_CONFIG, tenant } from "../api/Config";
import { configureSentry } from "../api/Sentry";
import { me } from "../api/Users";
import { WebsocketClient } from "../common/ws";
import {
    EVENT_API_DRAWER_TOGGLE,
    EVENT_NOTIFICATION_DRAWER_TOGGLE,
    EVENT_REFRESH,
} from "../constants";
import "../elements/messages/MessageContainer";
import "../elements/messages/MessageContainer";
import "../elements/notifications/NotificationDrawer";
import "../elements/router/RouterOutlet";
import "../elements/sidebar/Sidebar";
import { DefaultTenant } from "../elements/sidebar/SidebarBrand";
import "../elements/sidebar/SidebarItem";
import { ROUTES } from "../routesUser";
import { uiConfig } from "../user/config";
import { first } from "../utils";
import "./locale";

@customElement("ak-interface-user")
export class UserInterface extends LitElement {
    @property({ type: Boolean })
    notificationOpen = false;

    @property({ type: Boolean })
    apiDrawerOpen = false;

    ws: WebsocketClient;

    @property({ attribute: false })
    tenant: CurrentTenant = DefaultTenant;

    @property({ type: Number })
    notificationsCount = -1;

    static get styles(): CSSResult[] {
        return [
            PFBase,
            PFBrand,
            PFPage,
            PFAvatar,
            PFButton,
            PFDrawer,
            PFDropdown,
            PFNotificationBadge,
            AKGlobal,
            css`
                .pf-c-page__main,
                .pf-c-drawer__content,
                .pf-c-page__drawer {
                    z-index: auto !important;
                    background-color: transparent !important;
                }
                .pf-c-page {
                    background-color: var(--pf-c-page--BackgroundColor) !important;
                }
                .display-none {
                    display: none;
                }
                .pf-c-brand {
                    min-height: 48px;
                    height: 48px;
                }
                .has-notifications {
                    color: #2b9af3;
                }
            `,
        ];
    }

    constructor() {
        super();
        this.ws = new WebsocketClient();
        window.addEventListener(EVENT_NOTIFICATION_DRAWER_TOGGLE, () => {
            this.notificationOpen = !this.notificationOpen;
        });
        window.addEventListener(EVENT_API_DRAWER_TOGGLE, () => {
            this.apiDrawerOpen = !this.apiDrawerOpen;
        });
        window.addEventListener(EVENT_REFRESH, () => {
            this.firstUpdated();
        });
        tenant().then((tenant) => (this.tenant = tenant));
        configureSentry(true);
    }

    firstUpdated(): void {
        new EventsApi(DEFAULT_CONFIG)
            .eventsNotificationsList({
                seen: false,
                ordering: "-created",
                pageSize: 1,
            })
            .then((r) => {
                this.notificationsCount = r.pagination.count;
            });
    }

    render(): TemplateResult {
        return html`${until(
            uiConfig().then((config) => {
                return html`<div
                    class="pf-c-page"
                    style="background: ${config.color.background} !important"
                >
                    <header class="pf-c-page__header">
                        <div class="pf-c-page__header-brand">
                            <a href="#/" class="pf-c-page__header-brand-link">
                                <img
                                    class="pf-c-brand"
                                    src="${first(
                                        this.tenant.brandingLogo,
                                        DefaultTenant.brandingLogo,
                                    )}"
                                    alt="${(this.tenant.brandingTitle,
                                    DefaultTenant.brandingTitle)}"
                                />
                            </a>
                        </div>
                        <div class="pf-c-page__header-tools">
                            <div class="pf-c-page__header-tools-group">
                                ${config.enabledFeatures.apiDrawer
                                    ? html`<div
                                          class="pf-c-page__header-tools-item pf-m-hidden pf-m-visible-on-lg"
                                      >
                                          <button
                                              class="pf-c-button pf-m-plain"
                                              type="button"
                                              @click=${() => {
                                                  this.apiDrawerOpen = !this.apiDrawerOpen;
                                              }}
                                          >
                                              <i class="fas fa-code" aria-hidden="true"></i>
                                          </button>
                                      </div>`
                                    : html``}
                                ${config.enabledFeatures.notificationDrawer
                                    ? html`
                                          <button
                                              class="pf-c-button pf-m-plain"
                                              type="button"
                                              aria-label="${t`Unread notifications`}"
                                              @click=${() => {
                                                  this.notificationOpen = !this.notificationOpen;
                                              }}
                                          >
                                              <span
                                                  class="pf-c-notification-badge ${this
                                                      .notificationsCount > 0
                                                      ? "pf-m-unread"
                                                      : ""}"
                                              >
                                                  <i class="pf-icon-bell" aria-hidden="true"></i>
                                                  <span class="pf-c-notification-badge__count"
                                                      >${this.notificationsCount}</span
                                                  >
                                              </span>
                                          </button>
                                      `
                                    : html``}
                                ${config.enabledFeatures.settings
                                    ? html` <div
                                          class="pf-c-page__header-tools-item pf-m-hidden pf-m-visible-on-lg"
                                      >
                                          <a
                                              class="pf-c-button pf-m-plain"
                                              type="button"
                                              href="#/settings"
                                          >
                                              <i class="fas fa-cog" aria-hidden="true"></i>
                                          </a>
                                      </div>`
                                    : html``}
                                <a
                                    href="/flows/-/default/invalidation/"
                                    class="pf-c-button pf-m-plain"
                                >
                                    <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                                </a>
                                ${until(
                                    me().then((u) => {
                                        if (!u.user.isSuperuser) return html``;
                                        return html`
                                            <a
                                                class="pf-c-button pf-m-primary pf-m-small"
                                                href="/if/admin"
                                            >
                                                ${t`Admin interface`}
                                            </a>
                                        `;
                                    }),
                                )}
                            </div>
                            ${until(
                                me().then((u) => {
                                    if (u.original) {
                                        return html`<div class="pf-c-page__header-tools">
                                            <div class="pf-c-page__header-tools-group">
                                                <a
                                                    class="pf-c-button pf-m-warning pf-m-small"
                                                    href=${`/-/impersonation/end/?back=${window.location.pathname}%23${window.location.hash}`}
                                                >
                                                    ${t`Stop impersonation`}
                                                </a>
                                            </div>
                                        </div>`;
                                    }
                                    return html``;
                                }),
                            )}
                            <div class="pf-c-page__header-tools-group">
                                <div
                                    class="pf-c-page__header-tools-item pf-m-hidden pf-m-visible-on-md"
                                >
                                    ${until(
                                        me().then((me) => {
                                            switch (config.navbar.userDisplay) {
                                                case "username":
                                                    return me.user.username;
                                                case "name":
                                                    return me.user.name;
                                                case "email":
                                                    return me.user.email;
                                                default:
                                                    return me.user.username;
                                            }
                                        }),
                                    )}
                                </div>
                            </div>
                            ${until(
                                me().then((me) => {
                                    return html`<img
                                        class="pf-c-avatar"
                                        src=${me.user.avatar}
                                        alt="${t`Avatar image`}"
                                    />`;
                                }),
                            )}
                        </div>
                    </header>
                    <div class="pf-c-page__drawer">
                        <div
                            class="pf-c-drawer ${this.notificationOpen || this.apiDrawerOpen
                                ? "pf-m-expanded"
                                : "pf-m-collapsed"}"
                        >
                            <div class="pf-c-drawer__main">
                                <div class="pf-c-drawer__content">
                                    <div class="pf-c-drawer__body">
                                        <main class="pf-c-page__main">
                                            <ak-router-outlet
                                                role="main"
                                                class="pf-l-bullseye__item pf-c-page__main"
                                                tabindex="-1"
                                                id="main-content"
                                                defaultUrl="/library"
                                                .routes=${ROUTES}
                                            >
                                            </ak-router-outlet>
                                        </main>
                                    </div>
                                </div>
                                <ak-notification-drawer
                                    class="pf-c-drawer__panel pf-m-width-33 ${this.notificationOpen
                                        ? ""
                                        : "display-none"}"
                                    ?hidden=${!this.notificationOpen}
                                ></ak-notification-drawer>
                                <ak-api-drawer
                                    class="pf-c-drawer__panel pf-m-width-33 ${this.apiDrawerOpen
                                        ? ""
                                        : "display-none"}"
                                    ?hidden=${!this.apiDrawerOpen}
                                ></ak-api-drawer>
                            </div>
                        </div>
                    </div>
                </div>`;
            }),
        )}`;
    }
}
