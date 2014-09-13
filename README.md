## Hello.
Have you ever wanted to show someone something really cool in javascript, maybe
an extra sexy `reduce` or a cool syntactical trick? Of course you did. You wrote
your code, and it turned out fucking rad. Now how do you send this that special
somebody?

Sites like jsbin and codepen are cool for showing off full-blown demos. But you
want to show off some juicy javascript. You probaly hacked it around in the dev
tools of the browser of your choice, because they are a great environment for
just playing around with javascript.

But what if you could have a javascript console...in your browser?

And then share that hacking around session with those you love (or hate (or
feel no particular emotion for))?

http://apt-reference-695.appspot.com . It could take a bit to load. Yes, I know
the url sucks.

## What is this?
As the introduction above says, this is Chrome's dev tools javascript console in
a regular web page. To see how it was done, see the [How stuff works](#How stuff works)
section below.

Write some javascript, invite your friends, write some javascript on your
friends. You'll be the life of the party.

It's quite alphab but usable. Things work generally pretty well on Chrome,
Firefox has some jitters, IE will likely stay a mess for some time.

## Features
What you'd expect of Chrome dev tools' excellent console:

* JavaScript REPL
* Object inspection
* Completion suggestions
* Nice stack traces
* History
* Monkeys

### TODOs

* Implement ---all--- most console methods (dir, group, table, time, ...)
* Make it work across modern-ish browsers
* Introduction message
* Themes (?)
* Settings (?)
* Better editing (tab button support)

## How stuff works
The best way to learn how the dev tools works is by looking at the source and
playing around with it. The sources here are taken freshly squeezed from
chromium/chromium@66fbff9d3e1c441db581024895a959efc32deac2 . You can find it in
`third_party/WebKit/devtools/front_end`. May God have mercy on your soul.

(Yes, I'm planning on writing my findings down.)

Poke around, understand that `InspectorFrontendHost` and some other objects are
actually native bindings, be angry that that's the case. Raaaargh!!!!

You can actually inspect the dev-tools using the dev-tools. Hit Ctrl-Shift-J and
undock them if necessary. Then, simply hit Ctrl-Shift-J again. Have fun.

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
related functionality while trimming unnecessary portions.

All messages to the native backend funnel down to `jsh.handleMessage`.

### Structure
Frontend is in the `public/` directory; `/templates` and the rest are Google
App Engine boilerplate.

The directory structure is also of course copied directly from the dev tools'
source. I don't quite get it either. It's a mess.

If you want a starting point to hack things around, the index file is a bad
place to start. It's just a blob of scripts.

`jsh.js` is one place, as it contains the code for dealing with
messages ("evaluate this expression", "give me the properties of this object").

`InjectedScript.js` contains most if not all of the interesting logic.

`main/Main.js` is where most things happen: Settings up the UI, settings up the
different objects the UI uses. It's mostly baloney, though.

`sdk/ConsoleModel.js` is where the runtime/console API gets tied up to the UI,
and the good friends in the `console/` folder are where all the console UI logic
is done.

It's a lot of being confusing and `grep`ing for things.

## License
99% of the files here have a giant license block at the top. Basically, it's
directly from the dev tools source. This goes for any images in `css/Images`.

Favicon is from Github's [Octicon](https://octicons.github.com/) set. Expect a
new one.

Any code *I* write is under the [WTFPL](http://www.wtfpl.net/).
