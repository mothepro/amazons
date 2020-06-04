import { html, render } from 'lit-html'

import '../index.js'

const isProduction = location.protocol == 'https:',
  params = new URLSearchParams(location.search)

// Add `mo-amazons` element with the attributes if user has a name.
if (params.has('name'))
  render(html`
    <mo-amazons
      name=${params.get('name')!}
      signaling=${isProduction
        ? 'wss://ws.parkshade.com:443'
        : 'ws://localhost:12345'}
      .stuns=${[
        "stun:stun.stunprotocol.org", // http://www.stunprotocol.org/
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ]}
      retries=3
      timeout=5000
    ></mo-amazons>`, document.body)


/////////////////////////////////////////////////
// Global site tag(gtag.js) - Google Analytics //
/////////////////////////////////////////////////
// @ts-ignore
window.dataLayer = window.dataLayer || []
// @ts-ignore
function gtag() { dataLayer.push(arguments) }
// @ts-ignore
gtag('js', new Date)
// @ts-ignore
gtag('config', 'UA-48191613-7')
