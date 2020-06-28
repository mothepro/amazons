import { LitElement, html, customElement, property, internalProperty } from 'lit-element'
import type { SafeListener } from 'fancy-emitter'
import type { Client } from '@mothepro/fancy-p2p'
import storage from 'std:kv-storage'

export type ProposalEvent = CustomEvent<Client>
export type NameChangeEvent = CustomEvent<string>

declare global {
  interface HTMLElementEventMap {
    proposal: ProposalEvent
    'name-change': NameChangeEvent
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

  @internalProperty()
  private editing = false

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

  private saveName(oldName: string) {
    return (e: Event) => {
      const data = new FormData(e.target as HTMLFormElement),
        newName = data.get('newName')
    
      if (newName && newName != oldName) {
        storage.set('name', newName)
        this.dispatchEvent(new CustomEvent('name-change', { detail: newName }))
      }

      e.preventDefault()
      this.editing = false
    }
  }

  protected readonly render = () => html`
    <ul part="client-list">
      ${this.clients.map(({ client, action }) => client.isYou
        ? html`
        <li
         part="client is-you"
         @dblclick=${() => this.editing = true}>
         ${this.editing
          ? html`
          <form @submit=${this.saveName(client.name)}>
            <input part="edit-name" type="text" name="newName" placeholder="Your name" value=${client.name} />
          </form>`
          : client.name }
        </li>`
        : html`
        <li part="client is-other">
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
              @click=${() => this.dispatchEvent(new CustomEvent('proposal', { detail: client }))}>
                ${this.inviteText}
            </button>`}
        </li>`)}
    </ul>`
}
