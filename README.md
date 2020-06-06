# [`<amazons-online>`](https://amazons.parkshade.com)

> Peer to peer game of Amazons

[![npm](https://img.shields.io/npm/v/amazons.svg)](https://www.npmjs.com/package/amazons)
[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/amazons)

## Install

`yarn add amazons`

## How to Use

| Attribute | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `hidden` | `boolean` | `false` | Whether the element should be displayed |

<!--
Inline demo for webcomponents.org
```
<custom-element-demo>
  <template>
    <next-code-block></next-code-block>
  </template>
</custom-element-demo>
```
-->
```html
<!-- 
  Import the element.

  The `module` query parameter expands "bare" imports to full unpkg.com urls.
  This means use of an import map isn't needed.
  @see https://unpkg.com#query-params
-->
<script type="module" src="//unpkg.com/amazons/dist/esm/index.js?module"></script>

<amazons-online
  name="WebComponents Demo"
  signaling="wss://ws.parkshade.com:443"
  .stuns="[
    stun:stun.stunprotocol.org,
    stun:stun.l.google.com:19302,
    stun:stun1.l.google.com:19302,
    stun:stun2.l.google.com:19302,
    stun:stun3.l.google.com:19302,
    stun:stun4.l.google.com:19302,
  ]"
  retries=3
  timeout=5000
></amazons-online>
```

## Roadmap

+ Remove yellow square when opponent is trying to destroy
