import { customElement, LitElement, html, css, internalProperty, property } from 'lit-element'
import type { PieceMovedEvent, SpotDestroyedEvent } from '@mothepro/lit-amazons'
import type { Peer } from '@mothepro/fancy-p2p'
import Engine, { Color, Position } from '@mothepro/amazons-engine'

import '@mothepro/lit-amazons'
import 'lit-confetti'

// Note: board must be an 8x8 or smaller
const posToBuf = (...pos: Position[]) => new Uint8Array(
  pos.map(([x, y]) => x | y << 4))

const bufToPos = (data: ArrayBuffer) => [...new Uint8Array(data)].map(byte => ([
  byte & 0b0000_1111,
  byte >> 4,
] as Position))

@customElement('mo-amazons-game')
export default class extends LitElement {

  protected engine = new Engine

  @property({ type: Number })
  color!: Color

  @property({ attribute: false })
  peer!: Peer<ArrayBuffer>

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
    grid-auto-rows: 1fr;
    grid-auto-columns: 1fr;
    border: thin solid black;
    width: 1000px;
    height: 1000px;
  }
  
  :host ::part(spot) {
    width: 100%
  }
  
  :host ::part(spot-parity-same) {
    background-color: lightgrey;
  }
  :host ::part(symbol) {
    font-size: 5em;
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
  
  :host ::part(spot-valid) { /* TODO, do not style if [ignore] */
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
  }`

  protected async firstUpdated() {
    this.bindMessages()
    this.engine.start()
    for await (const _ of this.engine.stateChange)
      this.requestUpdate()
    this.confetti = 150
    setTimeout(() => this.confetti = 0, 10 * 1000)
  }

  private async bindMessages() {
    for await (const data of this.peer.message) {
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
          console.error(`Unexpected data from ${this.peer.name}`, data)
          break
      }
    }
  }

  private pieceMoved({ detail: { from, to } }: PieceMovedEvent) {
    this.engine.move(from, to)
    this.peer.send(posToBuf(from, to))
  }

  private spotDestroyed({ detail: spot }: SpotDestroyedEvent) {
    this.engine.destroy(spot)
    this.peer.send(posToBuf(spot))
  }

  protected readonly render = () => html`
    <h1>${this.engine.stateChange.isAlive
      ? `${this.engine.current == this.color ? 'Your' : `${this.peer.name}'s`} turn`
      : `${this.engine.waiting == this.color ? 'You Win' : `${this.peer.name} Wins`}!`
    }</h1>
    <lit-amazons
      ?ignore=${this.engine.current != this.color}
      state=${this.engine.state}
      current=${this.engine.current}
      .destructible=${this.engine.destructible}
      .pieces=${this.engine.pieces}
      .board=${this.engine.board}
      @piece-moved=${this.pieceMoved}
      @spot-destroyed=${this.spotDestroyed}
      @piece-picked=${() => this.setAttribute('dragging', '')}
      @piece-let-go=${() => this.removeAttribute('dragging')}
    ></lit-amazons>
    <lit-confetti count=${this.confetti} gravity=1></lit-confetti>`
}
