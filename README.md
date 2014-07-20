Embedded dev tools.

It's coming.

Nothing works yet, just numbers and booleans and strings really.

I'm too tired to write something here.

http://zirak.github.com/jsh . It'll take a while to load.

It's horrible and bloated, I know. It'll be better. Maybe. Yes. Definitely.

## Learning
The best way to learn how the dev tools works is by looking at the source and
playing around with it. The sources here are taken freshly squeezed from
chromium/chromium@66fbff9d3e1c441db581024895a959efc32deac2 . You can find it in
`third_party/WebKit/devtools/front_end`. May God have mercy on your soul.

Poke around, understand that `InspectorFrontendHost` and some other objects are
actually native bindings, be angry that that's the case. Raaaargh!!!!

You can actually inspect the dev-tools using the dev-tools. Hit Ctrl-Shift-J and
undock them if necesssary. Then, simply hit Ctrl-Shift-J again. Have fun.

To make things even more fun, in your inceptioned dev tools, run:

```javascript
InspectorBackendClass.Options.dumpInspectorProtocolMessages = true;
```

And proceed to do things. The bazingaload of messages you'll see are part of the
[protocol](https://developer.chrome.com/devtools/docs/protocol/1.1/index).

I wrote this clone by first including what seemed like obvious core console
functionality (that is, everything in the console directory), followed by
main/Main.js (because hey, it's main), and then started to slowly (ssllloooowwwllllyyyy)
fix the `ReferenceError`s and `TypeError`s.

This means that while at its base the console "works", there are a lot of hidden
booby-traps and unimplemented functionality. At the same time, there is a lot of
code which just isn't useful (why do we need a VBox and the SplitView and the
tabs pane and so forth?). The way forward is implementing more and more console
related functionality, while trimming unnecessary portions.

Probably *the* most important piece of half-ass-not-really implemented
functionality is the `Runtime.Evaluate` message, the core we're trying to wrap,
how the console works. There are lots of nooks and crannies.

All `Runtime.evaluate` calls funnel down to `WebInspector.evaluateLikeABoss`,
which is declared in `common/WebInspector.js`. So far it's pathetic, I know.
Don't look at me.

## License
99% of the files here have a giant license block at the top. Basically, it's
directly from the dev tools source. This goes for any images in `css/Images`.

Favicon is from Github's [Octicon](https://octicons.github.com/) set. Expect a
new one.

Any code *I* write is under the [WTFPL](http://www.wtfpl.net/).
