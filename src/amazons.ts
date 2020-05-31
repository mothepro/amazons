import { customElement, LitElement, html, css, internalProperty, property } from 'lit-element'
import type { PieceMovedEvent, SpotDestroyedEvent } from '@mothepro/lit-amazons'
import type { Peer } from '@mothepro/fancy-p2p'
import Engine, { Color } from '@mothepro/amazons-engine'

import '@mothepro/lit-amazons'
import 'lit-confetti'

@customElement('mo-amazons-game')
export default class extends LitElement {

  protected engine = new Engine

  @property({ type: Number })
  color!: Color

  @property({ attribute: false })
  peer!: Peer

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
  
  :host ::part(spot-valid) {
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

  async firstUpdated() {
    this.engine.start()
    for await (const _ of this.engine.stateChange)
      this.requestUpdate()
    this.confetti = 150
    setTimeout(() => this.confetti = 0, 10 * 1000)
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
      @piece-moved=${({ detail: { from, to } }: PieceMovedEvent) => this.engine.move(from, to)}
      @spot-destroyed=${({ detail }: SpotDestroyedEvent) => this.engine.destroy(detail)}
      @piece-picked=${() => this.setAttribute('dragging', '')}
      @piece-let-go=${() => this.removeAttribute('dragging')}
    ></lit-amazons>
    <lit-confetti count=${this.confetti} gravity=1></lit-confetti>`
}
