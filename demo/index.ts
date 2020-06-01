import { html, render } from 'lit-html'
import '../index.js'

const params = new URLSearchParams(location.search)

// Add `mo-amazons` element with the attributes if user has a name.
if (params.has('name'))
  render(html`
    <mo-amazons
      name=${params.get('name')!}
      retries=5
      timeout=5000
    ></mo-amazons>`, document.body)
