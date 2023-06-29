# alt:V Event Suggestions

When you're working with custom events on an alt:V project it's really hard to keep track of event names in a cross-resource setting.

This means that you must mentally keep track of all events you create.

You also have to keep complete track of all the parameters between resources.

This extension hopes to resolve that.

## Features

* Better event name auto-completion for cross-resource usage.
* Better parameter suggestions if a comment is placed above the original emit.

## Event Support

✅  WebView to Client
✅  Client to WebView
✅  Client to Client 
✅  Server to Server 
✅  Server to Client (player.emit, and alt.emitClient)
✅  Client to Server

## What is the problem?

When using `emit` the event is not propogated to the appropriate `alt.on` handler.

```ts
alt.emit('i-do-something', somePlayer, someValue, whatever);
alt.emitClient(somePlayer, 'i-go-to-client');
alt.emitServer('i-go-to-server')
```

In your other resource when you type `alt.on`, `alt.onClient`, or `alt.onServer` you don't get any event suggestions for **your** events.

Instead you get just the default `alt:V` events that are available.

![](https://i.imgur.com/6KAQ8Zy.png)

With this extension, your custom events will now show up based on where they are available.

![](https://i.imgur.com/sEaijRF.png)

## Declaring Emit Parameters

Emits can also automatically give parameter suggestions when creating an event.

Simply add the suggested parameters above the emit.

```ts
// player, message, aNumber
alt.emitServer('going-to-server', 'hello', 5);
```

Once declared above the emit, the auto-suggestion after filling in `alt.on` will fill out the rest.

```ts
alt.onClient('going-to-server', (player, message, aNumber) => {
    console.log(`Got: ${message}, ${value}`);
});
```