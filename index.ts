import { Spot } from '@mothepro/amazons-engine'
import storage from 'std:kv-storage'
import { LitElement, html, customElement, property, css } from 'lit-element'
import P2P, { State } from '@mothepro/fancy-p2p'
import type { ProposalEvent, NameChangeEvent } from './src/lobby.js'
import pkg from './package.json'

import './src/lobby.js'
import './src/amazons.js'

/** Keys for storing data in kv-storage */
const enum Keys {
  /** The name of the user to connect in the lobby as. */
  NAME = 'name'
}

@customElement('amazons-online')
export default class extends LitElement {
  /** List of STUN servers to broker P2P connections. */
  @property({ type: Array, reflect: true })
  stuns!: string[]

  /** Address to the signaling server. */
  @property({ type: String, reflect: true })
  signaling!: string

  /** Version of the signaling server. */
  @property({ type: String, reflect: true })
  version!: string

  /** Number of times to attempt to make an RTC connection. Defaults to 1 */
  @property({ type: Number, reflect: true })
  retries!: number

  /** The number of milliseconds to wait before giving up on the connection. Doesn't give up by default */
  @property({ type: Number, reflect: true })
  timeout!: number

  private p2p?: P2P<ArrayBuffer>

  static readonly styles = css`
    duo-lobby {
      display: block;
      margin: 0 auto;
      max-width: 400px;
      border: 1px solid #d3d3d3;
      border-radius: 0.5em;
    }`

  protected async firstUpdated() {
    this.connect((await storage.get(Keys.NAME) || '').toString())
  }

  private async connect(name: string) {
    this.p2p = new P2P(name, {
      retries: this.retries,
      timeout: this.timeout,
      stuns: this.stuns,
      lobby: `${pkg.name}@${pkg.version}`,
      server: {
        address: this.signaling,
        version: this.version,
      },
    })

    try {
      for await (const _ of this.p2p!.stateChange)
        this.requestUpdate() // Bind state changes to the DOM
    } catch (err) {
      console.error(err)
    }
    this.requestUpdate()
  }

  private nameChange({ detail }: NameChangeEvent) {
    try {
      storage.set(Keys.NAME, detail)
      this.p2p?.leaveLobby()
      this.connect(detail)
    } catch (err) {
      console.error('Unable to reconnect', err)
    }
  }

  private proposeGroup({ detail }: ProposalEvent) {
    try {
      this.p2p!.proposeGroup(detail)
    } catch (err) {
      console.error('Proposal failed', err)
    }
  }

  protected readonly render = () => {
    if (this.p2p?.stateChange.isAlive)
      switch (this.p2p!.state) {
        case State.LOBBY:
          return html`
            <duo-lobby
              .connection=${this.p2p.lobbyConnection}
              @proposal=${this.proposeGroup}
              @name-change=${this.nameChange}
            ></duo-lobby>`

        case State.LOADING:
          return html`<slot>Loading...</slot>`

        case State.READY:
          return html`
            <amazons-with-peers
              .broadcast=${this.p2p.broadcast}
              .peers=${{
                [Spot.BLACK]: this.p2p.peers[0],
                [Spot.WHITE]: this.p2p.peers[1],
              }}
            ></amazons-with-peers>`
      }

    return html`<slot>Offline</slot>`
  }
}
