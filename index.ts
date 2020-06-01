import { Color, Spot } from '@mothepro/amazons-engine'
import { LitElement, html, customElement, property, internalProperty } from 'lit-element'
import P2P, { State } from '@mothepro/fancy-p2p'
import type { ProposalEvent } from './src/lobby.js'
import { name, version } from './package.json'
import { stuns, signaling, retries, timeout } from './src/config.js'

import './src/lobby.js'
import './src/amazons.js'

@customElement('mo-amazons')
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

  @internalProperty()
  private color?: Color

  private p2p?: P2P<ArrayBuffer>

  protected async firstUpdated() {
    this.p2p = new P2P({
      name: this.name,
      retries: this.retries,
      timeout: this.timeout,
      stuns: this.stuns,
      lobby: `${name}@${version}`,
      server: {
        address: new URL(this.signaling),
        version: '0.2.0',
      },
    })

    try {
      for await (const state of this.p2p!.stateChange) {
        this.requestUpdate() // Bind state changes to the DOM

        // Determine our colors once ready
        if (state == State.READY) {
          const myVal = Math.trunc(Math.random() * 2 ** 32),
            { send, message: { next } } = [...this.p2p!.peers][0]

          // Trade random numbers
          setTimeout(() => send(new Uint32Array([myVal])), 1000) // wait a second so that both listeners have reached this point.
          const otherVal = new DataView(await next).getUint32(0, true)

          // Larger number is black 😊
          // TODO if same... this will not be good 😬
          this.color = myVal > otherVal ? Spot.BLACK : Spot.WHITE
        }
      }
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
            <mo-lobby
              .connection=${this.p2p.connection}
              @proposal=${this.proposeGroup}
            ></mo-lobby>`

        case State.LOADING:
          return html`<slot name="loading">Loading...</slot>`

        case State.READY:
          return typeof this.color != 'undefined'
            ? html`
            <mo-amazons-game
              .color=${this.color}
              .peer=${[...this.p2p.peers][0]}
            ></mo-amazons-game>`
            : 'determining who goes first...'
      }

    return html`<slot name="offline">Offline</slot>`
  }
}
