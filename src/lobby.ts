import { LitElement, html, customElement, property, internalProperty } from 'lit-element'
import type { SafeListener } from 'fancy-emitter'
import type { Client } from '@mothepro/fancy-p2p'

export type ProposalEvent = CustomEvent<Client>

declare global {
  interface HTMLElementEventMap {
    proposal: ProposalEvent
  }
}

@customElement('duo-lobby')
export default class extends LitElement {
  /** Text that should show up on the invite button. */
  @property({ type: String })
  inviteText = 'Invite'
  /** Text that should show up on the accept button. */
  @property({ type: String })
  acceptText = 'Accept'
  /** Text that should show up on the reject button. */
  @property({ type: String })
  rejectText = 'Reject'

  /** Activated when a client joins the lobby */
  @property({ attribute: false })
  connection!: SafeListener<Client>

  /** Others connected to the lobby. */
  @internalProperty()
  private clients: {
    client: Client
    action?: (accept: boolean) => void
  }[] = []

  protected async firstUpdated() {
    for await (const client of this.connection)
      this.bindClient(client)
  }

  private async bindClient(client: Client) {
    this.clients = [...this.clients, { client }]
    for await (const { action } of client.proposals)
      this.clients = this.clients.map(item => item.client == client
        ? { client, action }
        : item)
    this.clients = this.clients.filter(({ client: currentClient }) => currentClient != client)
  }

  protected readonly render = () => html`
    <ul part="client-list">
      ${this.clients.map(({ client, action }) => html`
      <li part="client is-${client.isYou ? 'you': 'other'}">
        ${client.name}
        ${action
        ? html`
          <button
            part="accept"
            @click=${() => {
              action(true)
              this.clients = this.clients.map(item => item.client == client ? { client, action: undefined } : item)
            }}>${this.acceptText}</button>
          <button
            part="reject"
            @click=${() => {
              this.clients = this.clients.map(item => item.client == client ? { client, action: undefined } : item)
              action(false)
            }}>${this.rejectText}</button>`
        : html`
          <button
            part="invite"
            ?disabled=${client.isYou}
            @click=${() => !client.isYou // Can't propose to self
              && this.dispatchEvent(new CustomEvent('proposal', { detail: client }))
            }>${this.inviteText}</button>`}
      </li>`)}
    </ul>`
}
