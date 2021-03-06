import { customElement, LitElement, html, css, property } from 'lit-element'
import type { PieceMovedEvent, SpotDestroyedEvent } from '@mothepro/lit-amazons'
import type { Peer } from '@mothepro/fancy-p2p'
import Amazons, { Color, Position } from '@mothepro/amazons-engine'

import 'lit-p2p'
import '@mothepro/lit-amazons'

export type GameOverEvent = CustomEvent<Color>

declare global {
  interface HTMLElementEventMap {
    'game-over': GameOverEvent
  }
}

// Note: board must be an 8x8 or smaller
const posToBuf = (...pos: Position[]) => new Uint8Array(
  pos.map(([x, y]) => x | y << 4))

const bufToPos = (data: ArrayBuffer) => [...new Uint8Array(data)].map(byte => ([
  byte & 0b0000_1111,
  byte >> 4,
] as Position))

@customElement('amazons-with-peers')
export default class extends LitElement {

  protected engine = new Amazons

  @property({ attribute: false })
  peers?: Peer<ArrayBuffer>[]

  @property({ attribute: false })
  broadcast?: (data: ArrayBuffer, includeSelf?: boolean) => void

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

  connectedCallback() {
    console.log('connected', this.peers)
  }

  protected async firstUpdated() {
    console.log('updated', this.peers)
    return
    this.bindMessages(this.peers![0], 1)
    this.bindMessages(this.peers![1], 2)

    this.engine.start()
    for await (const _ of this.engine.stateChange)
      this.requestUpdate()
    this.dispatchEvent(new CustomEvent('game-over', { detail: this.engine.waiting }))
  }

  private async bindMessages({ message, name, close }: Peer<ArrayBuffer>, color: Color) {
    try {
      for await (const data of message) {
        if (this.engine.current != color)
          throw Error(`${name} sent ${data} (${data.byteLength} bytes) when it isn't their turn`)

        switch (data.byteLength) {
          case 1: // Destroy
            const [spot] = bufToPos(data)
            this.engine.destroy(spot)
            break

          case 2: // Move
            const [from, to] = bufToPos(data)
            this.engine.move(from, to)
            break

          default:
            throw Error(`Only expected 1 or 2 bytes, but ${name} sent ${data} (${data.byteLength} bytes)`)
        }
      }
    } catch (err) {
      console.error('Lost Connection with', name, err)
    }
  }

  protected readonly render = () => this.peers && this.broadcast && html`
    <h1 part="title is-${this.engine.stateChange.isAlive ? 'ongoing' : 'over'}">${this.engine.stateChange.isAlive
      ? this.peers[this.engine.current].isYou
        ? 'Your turn'
        : `${this.peers[this.engine.current].name}'s turn`
      : this.peers[this.engine.waiting].isYou
        ? 'You Win!'
        : `${this.peers[this.engine.waiting].name} Wins!`
    }</h1>
    <lit-amazons
      part="game"
      ?ignore=${!this.peers[this.engine.current].isYou}
      state=${this.engine.state}
      current=${this.engine.current}
      .destructible=${this.engine.destructible}
      .pieces=${this.engine.pieces}
      .board=${this.engine.board}
      @piece-moved=${({ detail: { from, to } }: PieceMovedEvent) => this.broadcast!(posToBuf(from, to))}
      @spot-destroyed=${({ detail: spot }: SpotDestroyedEvent) => this.broadcast!(posToBuf(spot))}
      @piece-picked=${() => this.setAttribute('dragging', '')}
      @piece-let-go=${() => this.removeAttribute('dragging')}
    ></lit-amazons>`
}
