# Proppy Web frontend


## Requirements
nodejs >= 6.0 && yarn >= 0.18.1 (newer versions should work).
You also need to have read the following docs:

- https://facebook.github.io/react/docs/getting-started.html


## Installation

```js
yarn install
```


## Dev server

```js
yarn start
```

And open localhost:3000 in your browser.
The dev server will try to automatically hot-reload the components/reducers
without you having to F5. The Sass is not injected though and will need a refresh for the changes to be visible.

This will also lint files on changes (and will not continue until the linting passes) and run tests automatically on changes.

You can have a look at the scripts in package.json if you want to run some parts individually.

## Editor

The editor is probably the most complex part in proppy.

The editor is organised into blocks, and each block has a type and is identified by a UUID. Block order is established by keeping them in an `Immutable.List`. The differnt block types can be found in [src/app/constants/blocks.ts](src/app/constants/blocks.ts).

React is structured as a render function based on some data. Sadly, when React renders a content-editable which currently has the text cursor in it it causes the browser to lose focus. To avoid this we check in Block.tsx's `shouldComponentUpdate` whether the block has the cursor, and if it does we don't update the content-editable, thus keeping the cursor intact.


## Saving proposals

When a proposal is edited in more than one tab, or by more than one user other services get into a "latest wins" race which can be frustrating. In order to work around that we combine a three-way-merge with operational transforms to resolve concurrent edits. We keep three versions of blocks:

* Common ancestor blocks - these are the blocks that are the same on the server and the client (e.g. by virtue of being freshly fetched)
* Local blocks - the blocks in a single browser tab
* Server blocks - whatever we're fetching from the server

Unlike git we have to resolve all conflicts because we can't ask the user to resolve merge conflicts. The resolution is based on some heuristics that should avoid massive data loss, see [./src/app/utils/merge.ts](./src/app/utils/merge.ts) for details.

In order to keep the differences between server and client small we will also introduce a websocket server that notifies all clients on server updates. The three-way merge proceeds as normal on a server-only update.

