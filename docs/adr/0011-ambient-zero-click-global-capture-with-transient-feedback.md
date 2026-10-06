# 0011. Ambient Zero-Click Global Capture with Transient Feedback

We decided that the `phaste` web client will function as an ambient listener. Pressing `Cmd+V` / `Ctrl+V` or dropping files anywhere in the window immediately inspects clipboard MIME items, auto-detects content kind (URL, video URL, image blob, code, rich text), and triggers immediate asynchronous persistence without requiring focused inputs or modal confirmation. Feedback is provided through a non-blocking Material 3 snackbar offering quick undo or optional tagging.
