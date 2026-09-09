// Just a mental check: in JS, if an error is thrown inside a catch block of an async function, the promise returned by the async function rejects.
// If the async function was called as an event handler (e.g. onClick), React DOES NOT care about the returned promise rejecting. 
// Unhandled promise rejections do not crash the React component tree.
console.log("Unhandled promise rejections don't unmount React trees.");
