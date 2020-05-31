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
  // TODO group clients and proposals in one array
  @internalProperty()
  private clients: Client[] = []

  /** List of incoming proposals */
  @internalProperty()
  private proposals: {
    name: string
    action: (accept: boolean) => void
  }[] = []

  protected async firstUpdated() {
    for await (const client of this.connection) {
      this.clients = [...this.clients, client]
      this.bindDisconnection(client)
      this.bindProposals(client)
    }
  }

  private async bindDisconnection(client: Client) {
    await client.disconnect.event
    this.clients = this.clients.filter(currentClient => currentClient != client)
  }

  private async bindProposals({ name, initiator }: Client) {
    for await (const { action } of initiator)
      this.proposals = [...this.proposals, { name, action }]
  }

  // TODO group clients and proposals in one nice UI
  protected readonly render = () => html`${this.clients.length
    ? html`
      ${this.proposals.map(({ name, action }, index) => html`
        Play against ${name}?
        <button
          @click=${() => {
            this.proposals = this.proposals.filter((_, i) => index != i)
            action(true)
          }}>Accept</button>
        <button
          @click=${() => {
            this.proposals = this.proposals.filter((_, i) => index != i)
            action(false)
          }}>Reject</button>
        <br/>`)}
      Who do you want to play against?
      <ul>
        ${[...this.clients].map(client => html`
        <li
          @click=${(event: Event) => // Propose group of all the ack'd clients
            this.dispatchEvent(new CustomEvent('proposal', { detail: client }))
            && event.preventDefault()
          }>
          ${client.name}     
        </li>`)}
      </ul>`
    : 'No one else has joined this lobby... yet.'}`
}
