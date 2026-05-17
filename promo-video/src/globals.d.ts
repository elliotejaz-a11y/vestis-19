// Remotion 4.0.x references bare `Timer` which was removed from @types/node global scope
type Timer = ReturnType<typeof setInterval>;
