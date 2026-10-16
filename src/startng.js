const START_NG = "https://start.ng";
const API = "https://api.start.ng";

let framePromise;
export function connectFrame() {
  if (!framePromise) {
    framePromise = new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.src = `${START_NG}/connect`;
      frame.hidden = true;
      frame.title = "start.ng connection";
      frame.onload = () => resolve(frame);
      frame.onerror = reject;
      document.body.append(frame);
    });
  }
  return framePromise;
}

export async function askStartNg(message, replyType, timeoutMs = 5000) {
  let frame;
  try {
    frame = await connectFrame();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const finish = (reply) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(reply);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    function onMessage(event) {
      if (event.origin !== START_NG || event.source !== frame.contentWindow) return;
      if (event.data?.type === replyType && event.data.requestId === requestId) finish(event.data);
    }
    window.addEventListener("message", onMessage);
    frame.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

export const signInUrl = () =>
  `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;

export async function getPlayer() {
  const reply = await askStartNg({ type: "startng:whoami" }, "startng:user");
  if (!reply) return { player: null, connected: false, guest: false };
  return {
    player: reply.user ?? reply.guest ?? null,
    signedIn: Boolean(reply.user),
    guest: Boolean(reply.guest && !reply.user),
    connected: true,
  };
}

export async function saveScore(score) {
  return askStartNg({ type: "startng:score", stats: { score: Math.max(0, Math.floor(score)) } }, "startng:scoreSaved");
}

export async function getLeaderboard() {
  return askStartNg({ type: "startng:leaderboard", limit: 10 }, "startng:leaderboardData");
}

export function onStartNgReturn(callback) {
  const refresh = () => callback();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  window.addEventListener("focus", refresh);
}
