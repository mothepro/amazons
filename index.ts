import { Spot } from '@mothepro/amazons-engine'
import { LitElement, html, customElement, property } from 'lit-element'
import P2P, { State } from '@mothepro/fancy-p2p'
import type { ProposalEvent } from './src/lobby.js'
import pkg from './package.json'

import './src/lobby.js'
import './src/amazons.js'

@customElement('amazons-online')
export default class extends LitElement {
  /** Name of player in lobby. */
  @property({ type: String })
  name!: string

  /** List of STUN servers to broker P2P connections. */
  @property({ type: Array })
  stuns!: string[]

  /** Address to the signaling server. */
  @property({ type: String })
  signaling!: string

  /** Number of times to attempt to make an RTC connection. Defaults to 1 */
  @property({ type: Number })
  retries!: number

  /** The number of milliseconds to wait before giving up on the connection. Doesn't give up by default */
  @property({ type: Number })
  timeout!: number

  private p2p?: P2P<ArrayBuffer>

  protected async firstUpdated() {
    this.p2p = new P2P({
      name: this.name,
      retries: this.retries,
      timeout: this.timeout,
      stuns: this.stuns,
      lobby: `${pkg.name}@${pkg.version}`,
      server: {
        address: new URL(this.signaling),
        version: '0.2.0',
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
              .connection=${this.p2p.connection}
              @proposal=${this.proposeGroup}
            ></duo-lobby>`

        case State.LOADING:
          return html`<slot name="loading">Loading...</slot>`

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

    return html`<slot name="offline">Offline</slot>`
  }
}
