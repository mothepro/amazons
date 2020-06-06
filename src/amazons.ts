import { customElement, LitElement, html, css, internalProperty, property } from 'lit-element'
import type { PieceMovedEvent, SpotDestroyedEvent } from '@mothepro/lit-amazons'
import type { Peer } from '@mothepro/fancy-p2p'
import Amazons, { Color, Position } from '@mothepro/amazons-engine'

import '@mothepro/lit-amazons'
import 'lit-confetti'

// Note: board must be an 8x8 or smaller
const posToBuf = (...pos: Position[]) => new Uint8Array(
  pos.map(([x, y]) => x | y << 4))

const bufToPos = (data: ArrayBuffer) => [...new Uint8Array(data)].map(byte => ([
  byte & 0b0000_1111,
  byte >> 4,
] as Position))

@customElement('amazons-with-peers')
export default class extends LitElement {

  protected amazons = new Amazons

  @property({ attribute: false })
  peers!: Record<Color, Peer<ArrayBuffer>>

  @property({ attribute: false })
  broadcast!: (data: ArrayBuffer, includeSelf?: boolean) => void

  @internalProperty()
  protected confetti = 0

  static readonly styles = css`
  :host {
    display: block;
    text-align: center;
  }
  :host lit-confetti {
    position: fixed;
  }
  :host lit-amazons {
    border: thin solid black;
    margin: 0 auto;
    grid-auto-rows: 1fr;
    grid-auto-columns: 1fr;
    width: 100%;
    max-width: 1000px;
    max-height: 1000px;
  }
  
  :host ::part(spot) {
    width: 100%
  }
  
  :host ::part(spot-parity-same) {
    background-color: lightgrey;
  }
  :host ::part(symbol-draggable) {
    cursor: grab;
  }
  :host ::part(symbol-draggable):active {
    color: red;
  }
  :host([dragging]) ::part(symbol-draggable) {
    cursor: grabbing;
  }
  
  :host :not([ignore])::part(spot-valid) {
    background-color: yellow;
  }
  :host ::part(spot-valid):hover {
    cursor: pointer;
    border: thin solid red;
  }
  :host ::part(symbol-1):before {
    content: '♛';
  }
  :host ::part(symbol-2):before {
    content: '♕';
  }
  :host ::part(symbol-4):before {
    content: '💥';
  }

  /* Symbol Sizing */
  :host ::part(symbol) {
    font-size: 1em;
  }
  @media (min-width: 576px) { /* bootstrap "sm" */
    :host ::part(symbol) {
      font-size: 2em;
    }
  }
  @media (min-width: 768px) { /* bootstrap "md" */
    :host ::part(symbol) {
      font-size: 3em;
    }
  }
  @media (min-width: 992px) { /* bootstrap "lg" */
    :host ::part(symbol) {
      font-size: 4em;
    }
  }
  @media (min-width: 1200px) { /* bootstrap "xl" */
    :host ::part(symbol) {
      font-size: 5em;
    }
  }`

  protected async firstUpdated() {
    for (const [color, peer] of Object.entries(this.peers))
      this.bindMessages(peer, parseInt(color))

    this.amazons.start()
    for await (const _ of this.amazons.stateChange)
      this.requestUpdate()

    this.confetti = 150
    setTimeout(() => this.confetti = 0, 10 * 1000)
  }

  private async bindMessages({ message, name }: Peer<ArrayBuffer>, color: Color) {
    try {
      for await (const data of message) {
        if (this.amazons.current != color)
          throw Error(`${name} sent ${data} (${data.byteLength} bytes) when it isn't their turn`)

        switch (data.byteLength) {
          case 1: // Destroy
            const [spot] = bufToPos(data)
            this.amazons.destroy(spot)
            break

          case 2: // Move
            const [from, to] = bufToPos(data)
            this.amazons.move(from, to)
            break

          default:
            throw Error(`Only expected 1 or 2 bytes, but ${name} sent ${data} (${data.byteLength} bytes)`)
        }
      }
    } catch (err) {
      console.error('Connection broken with', name, err)
    }
    // game is no longer updated...
    // peer.close()
  }

  protected readonly render = () => html`
    <h1 part="title is-${this.amazons.stateChange.isAlive ? 'ongoing' : 'over'}">${this.amazons.stateChange.isAlive
      ? `${this.peers[this.amazons.current].isYou ? 'Your' : `${this.peers[this.amazons.current].name}'s`} turn`
      : `${this.peers[this.amazons.waiting].isYou ? 'You Win' : `${this.peers[this.amazons.waiting].name} Wins`}!`
    }</h1>
    <lit-amazons
      part="game"
      ?ignore=${!this.peers[this.amazons.current].isYou}
      state=${this.amazons.state}
      current=${this.amazons.current}
      .destructible=${this.amazons.destructible}
      .pieces=${this.amazons.pieces}
      .board=${this.amazons.board}
      @piece-moved=${({ detail: { from, to } }: PieceMovedEvent) => this.broadcast(posToBuf(from, to))}
      @spot-destroyed=${({ detail: spot }: SpotDestroyedEvent) => this.broadcast(posToBuf(spot))}
      @piece-picked=${() => this.setAttribute('dragging', '')}
      @piece-let-go=${() => this.removeAttribute('dragging')}
    ></lit-amazons>
    <lit-confetti part="confetti" gravity=1 count=${this.confetti}></lit-confetti>`
}
