import { LitElement, html, customElement, property, internalProperty } from 'lit-element'
import type { Listener } from 'fancy-emitter'
import type { Client } from '@mothepro/fancy-p2p'

export type ProposalEvent = CustomEvent<Client>

declare global {
  interface HTMLElementEventMap {
    proposal: ProposalEvent
  }
}

@customElement('mo-lobby')
export default class extends LitElement {
  /** Activated when a client joins the lobby */
  @property({ attribute: false })
  connection!: Listener<Client>

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
    for await (const { action } of client.propose)
      this.clients = this.clients.map(item => item.client == client
        ? { client, action }
        : item)
    this.clients = this.clients.filter(({ client: currentClient }) => currentClient != client)
  }

  // TODO group clients and proposals in one nice UI
  protected readonly render = () => html`${this.clients.length
    ? html`Who do you want to play against?
      <ul>
        ${[...this.clients].map(({ client, action }) => html`
        <li>
          <span @click=${(event: Event) => // Propose group of all the ack'd clients
              !client.isYou
              && this.dispatchEvent(new CustomEvent('proposal', { detail: client }))
              && event.preventDefault()}>
            ${client.name}
          </span>
          ${action ? html`
          <button @click=${() => {
            action(true)
            this.clients = this.clients.map(item => item.client == client ? { client, action: undefined } : item)
          }}>Accept</button>
          <button @click=${() => {
            this.clients = this.clients.map(item => item.client == client ? { client, action: undefined } : item)
            action(false)
          }}>Reject</button>` : ''}
        </li>`)}
      </ul>`
    : 'No one else has joined this lobby... yet.'}`
}
